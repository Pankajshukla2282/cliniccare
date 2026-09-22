import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector as NestReflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(NestReflector) private readonly reflector: NestReflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      user?: unknown;
    }>();
    const authorization = req.headers?.authorization ?? '';
    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    if (!match) throw new UnauthorizedException('Missing bearer token');

    try {
      req.user = await this.jwt.verifyAsync(match[1], { algorithms: ['HS256'], issuer: 'cliniccare', audience: 'cliniccare-web' });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

/**
 * Re-validates the authenticated principal and tenant on every protected request.
 * JWT claims are treated as a transport credential, never as the authoritative
 * source for account/tenant lifecycle state.
 */
@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    @Inject(NestReflector) private readonly reflector: NestReflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<any>();
    const sub = Number(req.user?.sub);
    if (!Number.isInteger(sub) || sub < 1) throw new UnauthorizedException('Invalid authenticated principal');

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true, email: true, organizationId: true, clinicId: true, primaryRole: true, status: true,
        organization: { select: { id: true, slug: true, status: true } },
        memberships: { where: { status: 'ACTIVE' }, select: { organizationId: true, defaultClinicId: true, organization: { select: { id: true, slug: true, status: true } } } },
      },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Account is inactive or suspended');

    const requestedSlug = String(req.header('x-tenant-slug') ?? '').trim().toLowerCase();
    let organizationId = user.organizationId;
    let tenantSlug = user.organization.slug ?? undefined;

    if (requestedSlug && requestedSlug !== tenantSlug) {
      if (user.primaryRole === 'SUPER_ADMIN') {
        const target = await this.prisma.organization.findFirst({ where: { slug: requestedSlug, status: { in: ['ACTIVE', 'TRIAL'] } }, select: { id: true, slug: true } });
        if (!target) throw new ForbiddenException('Requested tenant is unavailable');
        organizationId = target.id;
        tenantSlug = target.slug ?? undefined;
      } else {
        const membership = user.memberships.find((m) => m.organization.slug === requestedSlug && ['ACTIVE', 'TRIAL'].includes(m.organization.status));
        if (!membership) throw new ForbiddenException('User is not a member of the requested tenant');
        organizationId = membership.organizationId;
        tenantSlug = membership.organization.slug ?? undefined;
      }
    } else if (user.primaryRole !== 'SUPER_ADMIN' && !['ACTIVE', 'TRIAL'].includes(user.organization.status)) {
      throw new ForbiddenException('Organization is not active');
    }

    const requestedClinic = Number(req.header('x-clinic-id'));
    let clinicId = user.clinicId ?? null;
    if (Number.isInteger(requestedClinic) && requestedClinic > 0) {
      const clinic = await this.prisma.clinic.findFirst({ where: { id: requestedClinic, organizationId }, select: { id: true } });
      if (!clinic) throw new ForbiddenException('Requested clinic is outside the active tenant');
      clinicId = clinic.id;
    }

    const scopedAssignments = await this.prisma.userRole.findMany({
      where: {
        userId: user.id,
        OR: [{ organizationId }, { organizationId: null, role: 'SUPER_ADMIN' }],
        AND: [{ OR: [{ clinicId: null }, { clinicId }] }],
      },
      select: { role: true, organizationId: true, clinicId: true },
    });
    const roles = new Set<string>();
    if (user.primaryRole === 'SUPER_ADMIN' || organizationId === user.organizationId) roles.add(user.primaryRole);
    for (const assignment of scopedAssignments) roles.add(assignment.role);

    if (!roles.size) throw new ForbiddenException('No role is assigned in the active tenant');

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: { in: [...roles] as any }, OR: [{ organizationId }, { organizationId: null }] },
      select: { permission: true },
    });

    req.user = {
      ...req.user, sub: user.id, email: user.email, organizationId, clinicId, role: [...roles][0],
      permissions: rolePermissions.map((entry) => entry.permission), tenantSlug, roles: [...roles], environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
    };
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(NestReflector) private readonly reflector: NestReflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest<{ user?: { permissions?: string[] } }>();
    const granted = new Set(req.user?.permissions ?? []);
    if (granted.has('*')) return true;

    if (!required.every((permission) => granted.has(permission))) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ user?: { role?: string } }>();
    if (req.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin only');
    }
    return true;
  }
}
