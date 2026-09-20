import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
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
      req.user = await this.jwt.verifyAsync(match[1], { algorithms: ['HS256'] });
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
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<{
      user?: {
        sub?: number;
        organizationId?: number;
        role?: string;
        permissions?: string[];
        clinicId?: number | null;
        email?: string;
      };
    }>();

    const sub = Number(req.user?.sub);
    if (!Number.isInteger(sub) || sub < 1) {
      throw new UnauthorizedException('Invalid authenticated principal');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true,
        email: true,
        organizationId: true,
        clinicId: true,
        primaryRole: true,
        status: true,
        roles: { select: { role: true } },
        organization: { select: { status: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    // SUPER_ADMIN can manage tenant lifecycle, but must still be an active user.
    if (user.primaryRole !== 'SUPER_ADMIN' && !['ACTIVE', 'TRIAL'].includes(user.organization.status)) {
      throw new ForbiddenException('Organization is not active');
    }

    const roles = new Set([user.primaryRole, ...user.roles.map((entry) => entry.role)]);
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role: { in: [...roles] },
        OR: [{ organizationId: user.organizationId }, { organizationId: null }],
      },
      select: { permission: true },
    });

    // Replace mutable claims with authoritative database values. Permissions
    // are refreshed on every request so role/permission changes take effect
    // without waiting for an access-token refresh.
    req.user = {
      ...req.user,
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      clinicId: user.clinicId,
      role: user.primaryRole,
      permissions: rolePermissions.map((entry) => entry.permission),
    };

    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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
