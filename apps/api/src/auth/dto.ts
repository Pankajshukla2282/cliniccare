import { IsEmail, IsInt, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// Shared production password policy: min 8 chars, at least one letter and one
// digit. Kept in one place so register/signup/change/reset stay consistent.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&._-]{8,}$/;

export const StrongPassword = (): PropertyDecorator =>
  Matches(PASSWORD_PATTERN, {
    message: 'Password must be at least 8 characters with at least one letter and one number',
  });

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @StrongPassword()
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  // Patients register only inside their tenant; staff are provisioned by the
  // tenant admin. Never trusts a client-supplied role.
  @IsInt()
  organizationId!: number;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class TenantSignupDto {
  @IsString()
  organizationName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @StrongPassword()
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  clinicName?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @StrongPassword()
  newPassword!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @StrongPassword()
  newPassword!: string;
}
