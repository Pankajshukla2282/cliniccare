import { IsEmail, IsInt, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { apiConfig } from '../config';

// Shared password policy is environment-configurable and applied consistently to register/signup/change/reset.
const PASSWORD_PATTERN = new RegExp(`^(?=.*[A-Za-z])(?=.*[\\d])(?=.*[@$!%*#?&._-])[A-Za-z\\d@$!%*#?&._-]{${apiConfig.passwordMinLength},}$`);

export const StrongPassword = (): PropertyDecorator =>
  Matches(PASSWORD_PATTERN, {
    message: `Password must be at least ${apiConfig.passwordMinLength} characters with letters, digits, and a special character`,
  });

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(apiConfig.passwordMinLength)
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
  @MinLength(apiConfig.passwordMinLength)
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
  @MinLength(apiConfig.passwordMinLength)
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
  @MinLength(apiConfig.passwordMinLength)
  @StrongPassword()
  newPassword!: string;
}
