import { IsEnum, IsString } from 'class-validator';
import { Role } from '../generated/prisma/client';

export class AssignPermissionDto {
  @IsString()
  permission!: string;
}

export class AssignRoleDto {
  @IsEnum(Role)
  role!: Role;
}
