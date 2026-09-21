import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/client';
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
    const organizationId = scope.superAdmin ? (dto.organizationId ?? null) : scope.organizationId;
    if (!scope.superAdmin && dto.organizationId !== undefined && dto.organizationId !== scope.organizationId) throw new BadRequestException('Permission organization must match the active tenant');
    if (scope.superAdmin && dto.organizationId !== undefined) {
      const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId }, select: { id: true } });
      if (!org) throw new BadRequestException('Organization not found');
    }
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

  async revokePermission(role: Role, permission: string, scope: RbacScope, targetOrganizationId?: number) {
    const organizationId = scope.superAdmin ? (targetOrganizationId ?? null) : scope.organizationId;
    await this.prisma.rolePermission.deleteMany({
      where: { organizationId, role, permission },
    });
    return { revoked: true };
  }

  private async mustGetUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, primaryRole: true, roles: { select: { role: true, organizationId: true, clinicId: true, createdAt: true } } },
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
    const organizationId = scope.superAdmin ? (dto.organizationId ?? null) : scope.organizationId;
    if (!scope.superAdmin && dto.organizationId && dto.organizationId !== scope.organizationId) {
      throw new BadRequestException('Role organization must match the active tenant');
    }
    if (organizationId !== null) {
      const membership = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
      if (!membership) throw new BadRequestException('User is not a member of the target organization');
    }
    if (dto.clinicId !== undefined) {
      if (organizationId === null) throw new BadRequestException('Clinic scope requires an organization');
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.clinicId, organizationId }, select: { id: true } });
      if (!clinic) throw new BadRequestException('Clinic does not belong to the target organization');
    }
    const scopeKey = `${userId}:${dto.role}:${dto.clinicId ? `CLINIC:${dto.clinicId}` : `ORG:${organizationId ?? 'GLOBAL'}`}`;
    await this.prisma.userRole.deleteMany({ where: { userId, organizationId, clinicId: dto.clinicId ?? null, role: dto.role } });
    return this.prisma.userRole.create({
      data: { userId, organizationId, clinicId: dto.clinicId ?? null, role: dto.role, scopeKey },
    });
  }

  async addMembership(userId: number, dto: { organizationId: number; defaultClinicId?: number }, scope: RbacScope) {
    if (!scope.superAdmin && dto.organizationId !== scope.organizationId) throw new NotFoundException('Organization not found');
    const user = await this.mustGetUser(userId);
    if (!scope.superAdmin && user.organizationId !== scope.organizationId) throw new NotFoundException('User not found');
    const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId }, select: { id: true, status: true } });
    if (!org || !['ACTIVE', 'TRIAL'].includes(org.status)) throw new BadRequestException('Organization is unavailable');
    if (dto.defaultClinicId !== undefined) {
      const clinic = await this.prisma.clinic.findFirst({ where: { id: dto.defaultClinicId, organizationId: dto.organizationId }, select: { id: true } });
      if (!clinic) throw new BadRequestException('Clinic does not belong to the organization');
    }
    return this.prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId, organizationId: dto.organizationId } },
      create: { userId, organizationId: dto.organizationId, defaultClinicId: dto.defaultClinicId },
      update: { defaultClinicId: dto.defaultClinicId },
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
    await this.prisma.userRole.deleteMany({ where: { userId, role, organizationId: role === Role.SUPER_ADMIN && scope.superAdmin ? null : scope.organizationId } });
    return { revoked: true };
  }
}