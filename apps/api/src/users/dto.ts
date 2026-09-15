import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Role, UserStatus } from '../generated/prisma/client';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsInt()
  organizationId?: number;

  @IsOptional()
  @IsInt()
  clinicId?: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(Role)
  primaryRole?: Role;
}

export class AssignRoleDto {
  @IsEnum(Role)
  role!: Role;
}
