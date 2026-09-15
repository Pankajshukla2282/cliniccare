import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { TreatmentType } from '../generated/prisma/client';

export class CreateTreatmentPlanDto {
  @IsInt()
  patientId!: number;

  @IsInt()
  doctorId!: number;

  @IsOptional()
  @IsInt()
  clinicId?: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsEnum(TreatmentType)
  type?: TreatmentType;

  @IsOptional()
  @IsInt()
  totalSessions?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  targetCompletion?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddSessionDto {
  @IsOptional()
  @IsInt()
  sessionNumber?: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  parameters?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetSessionStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreatePackageDto {
  @IsInt()
  organizationId!: number;

  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsInt()
  totalSessions?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PurchasePackageDto {
  @IsInt()
  patientId!: number;

  @IsInt()
  packageId!: number;
}
