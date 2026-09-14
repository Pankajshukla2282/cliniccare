import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  trialEndsAt?: string;

  @IsOptional()
  @IsString()
  subRenewsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxClinics?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDoctors?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPatients?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}

export class ActivateTenantDto {
  @IsOptional()
  @IsString()
  plan?: string;
}