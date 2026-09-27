import { IsEmail, IsInt, IsOptional, IsString, MinLength, Matches } from 'class-validator';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&._-])[A-Za-z\d@$!%*#?&._-]{6,}$/;

export const StrongPassword = (): PropertyDecorator =>
  Matches(PASSWORD_PATTERN, {
    message: 'Password must be at least 6 characters with letters, digits, and a special character',
  });

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @StrongPassword()
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

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
  @MinLength(6)
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
  @MinLength(6)
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
  @MinLength(6)
  @StrongPassword()
  newPassword!: string;
}