import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, OrgId, Permissions, RequestUser } from '../common/decorators';
import { RbacService, RbacScope } from './rbac.service';
import { AssignPermissionDto, AssignRoleDto } from './rbac.dto';

@ApiTags('rbac')
@ApiBearerAuth()
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  private scopeFor(orgId: number, actor: RequestUser): RbacScope {
    return { organizationId: orgId, superAdmin: actor.role === 'SUPER_ADMIN' };
  }

  @Permissions('*')
  @Get('roles')
  listRoles() {
    return this.rbac.listRoles();
  }

  @Permissions('*')
  @Get('roles/:role/permissions')
  listPermissions(@OrgId() orgId: number, @CurrentUser() actor: RequestUser, @Param('role') role: Role) {
    return this.rbac.listPermissions(role, this.scopeFor(orgId, actor));
  }

  @Permissions('*')
  @Post('roles/:role/permissions')
  assignPermission(
    @OrgId() orgId: number,
    @CurrentUser() actor: RequestUser,
    @Param('role') role: Role,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.rbac.assignPermission(role, dto, this.scopeFor(orgId, actor));
  }

  @Permissions('*')
  @Delete('roles/:role/permissions/:permission')
  revokePermission(@OrgId() orgId: number, @CurrentUser() actor: RequestUser, @Param('role') role: Role, @Param('permission') permission: string) {
    return this.rbac.revokePermission(role, permission, this.scopeFor(orgId, actor));
  }

  @Permissions('*')
  @Get('users/:userId/roles')
  getUserRoles(@OrgId() orgId: number, @CurrentUser() actor: RequestUser, @Param('userId') userId: string) {
    return this.rbac.getUserRoles(Number(userId), this.scopeFor(orgId, actor));
  }

  @Permissions('*')
  @Post('users/:userId/roles')
  assignUserRole(@OrgId() orgId: number, @CurrentUser() actor: RequestUser, @Param('userId') userId: string, @Body() dto: AssignRoleDto) {
    return this.rbac.assignUserRole(Number(userId), dto, this.scopeFor(orgId, actor));
  }

  @Permissions('*')
  @Delete('users/:userId/roles/:role')
  revokeUserRole(@OrgId() orgId: number, @CurrentUser() actor: RequestUser, @Param('userId') userId: string, @Param('role') role: Role) {
    return this.rbac.revokeUserRole(Number(userId), role, this.scopeFor(orgId, actor));
  }
}