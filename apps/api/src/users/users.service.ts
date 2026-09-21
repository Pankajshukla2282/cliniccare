import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '../generated/prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto, CreateUserDto, UpdateUserDto } from './dto';
import { RequestUser } from '../common/decorators';

const BCRYPT_ROUNDS = Math.max(12, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12));

const ROLE_ASSIGNMENT: Record<Role, readonly Role[]> = {
  SUPER_ADMIN: Object.values(Role),
  ADMIN: [
    Role.CLINIC_ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.NURSE,
    Role.PHARMACIST, Role.ACCOUNTANT, Role.CONTENT_MANAGER, Role.PATIENT,
  ],
  CLINIC_ADMIN: [
    Role.DOCTOR, Role.RECEPTIONIST, Role.NURSE,
    Role.PHARMACIST, Role.ACCOUNTANT, Role.CONTENT_MANAGER, Role.PATIENT,
  ],
  DOCTOR: [],
  RECEPTIONIST: [],
  NURSE: [],
  PHARMACIST: [],
  ACCOUNTANT: [],
  CONTENT_MANAGER: [],
  PATIENT: [],
};

function patientNumber(): string {
  return `P-${randomBytes(4).toString('hex').toUpperCase()}`;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: number, skip = 0, take = 20) {
    const safeSkip = Math.max(0, Number.isFinite(skip) ? skip : 0);
    const safeTake = Math.min(Math.max(1, Number.isFinite(take) ? take : 20), 100);

    return this.prisma.user.findMany({
      where: { organizationId },
      skip: safeSkip,
      take: safeTake,
      orderBy: { id: 'asc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        primaryRole: true, status: true, clinicId: true, createdAt: true,
      },
    });
  }

  private assertCanManageRole(actor: RequestUser, targetRole: Role): void {
    const allowed = ROLE_ASSIGNMENT[actor.role as Role] ?? [];
    if (!allowed.includes(targetRole)) {
      throw new ForbiddenException(`Role ${targetRole} cannot be assigned by ${actor.role}`);
    }
  }

  async create(orgId: number, dto: CreateUserDto, actor: RequestUser) {
    this.assertCanManageRole(actor, dto.role);

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already registered');

    if (dto.clinicId !== undefined && dto.clinicId !== null) {
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, organizationId: orgId } });
      if (!clinic) throw new NotFoundException('Clinic not found');
    }

    const user = await this.prisma.user.create({
      data: {
        organizationId: orgId,
        clinicId: dto.clinicId,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        firstName: dto.firstName,
        lastName: dto.lastName,
        primaryRole: dto.role,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        primaryRole: true, status: true, clinicId: true, createdAt: true,
      },
    });

    await this.prisma.organizationMembership.create({ data: { userId: user.id, organizationId: orgId, defaultClinicId: dto.clinicId ?? null } });
    await this.prisma.userRole.create({
      data: { userId: user.id, organizationId: orgId, clinicId: dto.clinicId ?? null, role: dto.role, scopeKey: `${user.id}:${dto.role}:${dto.clinicId ? `CLINIC:${dto.clinicId}` : `ORG:${orgId}`}` },
    });

    if (dto.role === 'PATIENT') {
      await this.prisma.patient.create({
        data: { userId: user.id, organizationId: orgId, patientNumber: patientNumber() },
      });
    } else if (dto.role === 'DOCTOR') {
      await this.prisma.doctor.create({ data: { userId: user.id, clinicId: dto.clinicId } });
    }

    return user;
  }

  async get(id: number, organizationId?: number) {
    const user = await this.prisma.user.findUnique({
      where: organizationId !== undefined ? { id, organizationId } : { id },
      include: { roles: true, patient: true, doctor: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _ph, ...rest } = user;
    return rest;
  }

  async update(id: number, organizationId: number, dto: UpdateUserDto, actor: RequestUser) {
    const existing = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('User not found');

    if (dto.primaryRole !== undefined && dto.primaryRole !== existing.primaryRole) {
      this.assertCanManageRole(actor, dto.primaryRole);
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        primaryRole: true, status: true, clinicId: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async assignRole(id: number, organizationId: number, dto: AssignRoleDto, actor: RequestUser) {
    this.assertCanManageRole(actor, dto.role);
    await this.get(id, organizationId);

    const scopeKey = `${id}:${dto.role}:ORG:${organizationId}`;
    await this.prisma.userRole.deleteMany({ where: { userId: id, organizationId, role: dto.role, clinicId: null } });
    await this.prisma.userRole.create({
      data: { userId: id, organizationId, role: dto.role, scopeKey },
    });
    return this.get(id, organizationId);
  }
}
