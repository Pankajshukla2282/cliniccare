import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Role } from '../generated/prisma/client';

export class AssignPermissionDto {
  @IsString()
  permission!: string;

  @IsOptional()
  @IsInt()
  organizationId?: number;
}

export class AssignRoleDto {
  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsInt()
  organizationId?: number;

  @IsOptional()
  @IsInt()
  clinicId?: number;
}

export class AddMembershipDto {
  @IsInt()
  organizationId!: number;

  @IsOptional()
  @IsInt()
  defaultClinicId?: number;
}
