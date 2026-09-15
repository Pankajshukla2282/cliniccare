import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../generated/prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, TenantSignupDto } from './dto';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TENANT_TRIAL_DAYS = 14;
const DEFAULT_TENANT_PLAN = 'STARTER';
const DEFAULT_TENANT_LIMITS = { maxClinics: 1, maxDoctors: 5, maxPatients: 1000 };

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'tenant'
  );
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function patientNumber(): string {
  return `P-${randomBytes(4).toString('hex').toUpperCase()}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  private async permissionsFor(userId: number, primaryRole: Role): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    const orgId = user?.organizationId ?? null;
    const [extraRoles, perms] = await Promise.all([
      this.prisma.userRole.findMany({ where: { userId } }),
      this.prisma.rolePermission.findMany({
        where: orgId !== null ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {},
      }),
    ]);
    const roles = new Set<Role>([primaryRole, ...extraRoles.map((r) => r.role)]);
    return perms.filter((p) => roles.has(p.role)).map((p) => p.permission);
  }

  private async issueTokens(userId: number, email: string, role: Role, organizationId: number) {
    const permissions = await this.permissionsFor(userId, role);
    const accessToken = await this.jwt.signAsync({ sub: userId, email, role, permissions, organizationId });
    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { accessToken, refreshToken, permissions };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already registered');

    const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!org) throw new BadRequestException('Organization not found');
    if (!['ACTIVE', 'TRIAL'].includes(org.status)) {
      throw new UnauthorizedException('Organization is not accepting registrations');
    }

    // Role is never trusted from the client: patients self-register only.
    const role = Role.PATIENT;
    const user = await this.prisma.user.create({
      data: {
        organizationId: dto.organizationId,
        email: dto.email,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName,
        lastName: dto.lastName,
        primaryRole: role,
      },
    });

    await this.prisma.patient.create({
      data: { userId: user.id, organizationId: dto.organizationId, patientNumber: patientNumber() },
    });

    const tokens = await this.issueTokens(user.id, user.email, role, dto.organizationId);
    return { user: this.safe(user), ...tokens };
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 2;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  private async seedTenantDefaults(organizationId: number): Promise<void> {
    const templates = [
      { name: 'APPOINTMENT_CONFIRMED', channel: 'SMS' as const, content: 'Hi {{name}}, your appointment with {{doctor}} on {{date}} at {{time}} is confirmed.' },
      { name: 'APPOINTMENT_REMINDER', channel: 'WHATSAPP' as const, content: 'Reminder: appointment with {{doctor}} tomorrow at {{time}}.' },
      { name: 'ORDER_CONFIRMED', channel: 'EMAIL' as const, subject: 'Order confirmed', content: 'Hi {{name}}, your order {{orderNumber}} for Rs. {{total}} is confirmed.' },
    ];
    for (const t of templates) {
      await this.prisma.notificationTemplate.upsert({
        where: {
          organizationId_name_channel: { organizationId, name: t.name, channel: t.channel },
        },
        create: { organizationId, name: t.name, channel: t.channel, content: t.content, subject: t.subject },
        update: {},
      });
    }
  }

  async tenantSignup(dto: TenantSignupDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already registered');

    const name = dto.organizationName.trim();
    const slug = await this.uniqueSlug(slugify(name));
    const plan = process.env.TENANT_DEFAULT_PLAN ?? DEFAULT_TENANT_PLAN;
    const trialEndsAt = new Date(Date.now() + TENANT_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const org = await this.prisma.organization.create({
      data: {
        name,
        slug,
        legalName: dto.legalName,
        email: dto.email,
        phone: dto.phone,
        plan,
        status: 'TRIAL',
        trialEndsAt,
        onboardingCompleted: false,
        maxClinics: DEFAULT_TENANT_LIMITS.maxClinics,
        maxDoctors: DEFAULT_TENANT_LIMITS.maxDoctors,
        maxPatients: DEFAULT_TENANT_LIMITS.maxPatients,
      },
    });

    const clinic = await this.prisma.clinic.create({
      data: { organizationId: org.id, name: dto.clinicName?.trim() || 'Main Clinic' },
    });

    const user = await this.prisma.user.create({
      data: {
        organizationId: org.id,
        clinicId: clinic.id,
        email: dto.email,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName,
        lastName: dto.lastName,
        primaryRole: Role.CLINIC_ADMIN,
      },
    });

    await this.seedTenantDefaults(org.id);

    try {
      await this.audit.log({
        entityType: 'organization',
        entityId: org.id,
        action: 'TENANT_SIGNUP',
        performedBy: user.id,
        purpose: 'tenant_lifecycle',
      });
    } catch {}

    const tokens = await this.issueTokens(user.id, user.email, user.primaryRole, org.id);
    return {
      organization: { id: org.id, name: org.name, slug: org.slug, plan: org.plan, status: org.status, trialEndsAt: org.trialEndsAt },
      clinic: { id: clinic.id, name: clinic.name },
      user: this.safe(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.issueTokens(user.id, user.email, user.primaryRole, user.organizationId);
    try {
      await this.audit.log({
        entityType: 'user',
        entityId: user.id,
        action: 'LOGIN',
        performedBy: user.id,
        purpose: 'login_history',
      });
    } catch {
      // Audit must never fail a login
    }
    return { user: this.safe(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.expiresAt < new Date() || row.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(row.user.id, row.user.email, row.user.primaryRole, row.user.organizationId);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  listSessions(userId: number) {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: number, sessionId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async revokeAllSessions(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    // Revoke all sessions on password change for security
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    try {
      await this.audit.log({
        entityType: 'user',
        entityId: userId,
        action: 'PASSWORD_CHANGED',
        performedBy: userId,
        purpose: 'security',
      });
    } catch {}
    return { changed: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return { sent: true };
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    // In production: send email with token. For now, only the dev/dev-like
    // environment leaks the token in the response.
    this.audit.log({
      entityType: 'user',
      entityId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      performedBy: user.id,
      purpose: 'security',
    }).catch(() => {});
    return process.env.NODE_ENV === 'production' ? { sent: true } : { sent: true, _devToken: token };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    await this.prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { reset: true };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, patient: true, doctor: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return { ...this.safe(user), roles: user.roles.map((r) => r.role) };
  }

  private safe(user: { id: number; email: string; firstName: string; lastName: string; primaryRole: Role; status: string; organizationId: number }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.primaryRole,
      status: user.status,
      organizationId: user.organizationId,
    };
  }
}
