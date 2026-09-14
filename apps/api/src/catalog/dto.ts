import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateServiceCategoryDto {
  @IsInt()
  organizationId!: number;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateServiceDto {
  @IsInt()
  organizationId!: number;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  onlineAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  clinicAvailable?: boolean;

  @IsOptional()
  @IsInt()
  sessionCount?: number;

  @IsOptional()
  @IsBoolean()
  isPackageable?: boolean;

  @IsOptional()
  faqs?: { q: string; a: string }[];

  @IsOptional()
  @IsString()
  contraindications?: string;

  @IsOptional()
  @IsString()
  preparation?: string;

  @IsOptional()
  @IsString()
  aftercare?: string;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  onlineAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  clinicAvailable?: boolean;

  @IsOptional()
  @IsInt()
  sessionCount?: number;

  @IsOptional()
  @IsBoolean()
  isPackageable?: boolean;

  @IsOptional()
  faqs?: { q: string; a: string }[];

  @IsOptional()
  @IsString()
  contraindications?: string;

  @IsOptional()
  @IsString()
  preparation?: string;

  @IsOptional()
  @IsString()
  aftercare?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
