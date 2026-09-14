import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignPermissionDto, AssignRoleDto } from './rbac.dto';

export interface RbacScope {
  organizationId: number;
  superAdmin: boolean;
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  listRoles() {
    return Object.values(Role).map((role) => ({ role }));
  }

  async listPermissions(role: Role, scope: RbacScope) {
    const where = scope.superAdmin
      ? { role }
      : { role, OR: [{ organizationId: scope.organizationId }, { organizationId: null }] };
    const rows = await this.prisma.rolePermission.findMany({
      where,
      select: { organizationId: true, permission: true, createdAt: true },
      orderBy: { permission: 'asc' },
    });
    // Org-specific rows override the platform default of the same permission.
    const merged = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const existing = merged.get(row.permission);
      if (!existing || (existing.organizationId === null && row.organizationId !== null)) {
        merged.set(row.permission, row);
      }
    }
    return [...merged.values()].map((r) => ({ permission: r.permission, organizationId: r.organizationId, createdAt: r.createdAt }));
  }

  async assignPermission(role: Role, dto: AssignPermissionDto, scope: RbacScope) {
    const organizationId = scope.superAdmin ? null : scope.organizationId;
    if (organizationId === null) {
      // Platform defaults: delete-then-create keeps idempotency with NULL keys.
      await this.prisma.rolePermission.deleteMany({
        where: { organizationId: null, role, permission: dto.permission },
      });
      return this.prisma.rolePermission.create({
        data: { organizationId: null, role, permission: dto.permission },
      });
    }
    return this.prisma.rolePermission.upsert({
      where: { organizationId_role_permission: { organizationId, role, permission: dto.permission } },
      create: { organizationId, role, permission: dto.permission },
      update: {},
    });
  }

  async revokePermission(role: Role, permission: string, scope: RbacScope) {
    const organizationId = scope.superAdmin ? null : scope.organizationId;
    await this.prisma.rolePermission.deleteMany({
      where: { organizationId, role, permission },
    });
    return { revoked: true };
  }

  private async mustGetUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, primaryRole: true, roles: { select: { role: true, createdAt: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserRoles(userId: number, scope: RbacScope) {
    const user = await this.mustGetUser(userId);
    if (!scope.superAdmin && user.organizationId !== scope.organizationId) {
      throw new NotFoundException('User not found');
    }
    return {
      primaryRole: user.primaryRole,
      additionalRoles: user.roles,
    };
  }

  async assignUserRole(userId: number, dto: AssignRoleDto, scope: RbacScope) {
    const user = await this.mustGetUser(userId);
    if (!scope.superAdmin && user.organizationId !== scope.organizationId) {
      throw new NotFoundException('User not found');
    }
    if (dto.role === Role.SUPER_ADMIN && !scope.superAdmin) {
      throw new BadRequestException('SUPER_ADMIN can only be granted by the platform super admin');
    }
    return this.prisma.userRole.upsert({
      where: { userId_role: { userId, role: dto.role } },
      create: { userId, role: dto.role },
      update: {},
    });
  }

  async revokeUserRole(userId: number, role: Role, scope: RbacScope) {
    const user = await this.mustGetUser(userId);
    if (!scope.superAdmin && user.organizationId !== scope.organizationId) {
      throw new NotFoundException('User not found');
    }
    if (role === Role.SUPER_ADMIN && !scope.superAdmin) {
      throw new BadRequestException('SUPER_ADMIN can only be revoked by the platform super admin');
    }
    await this.prisma.userRole.deleteMany({ where: { userId, role } });
    return { revoked: true };
  }
}