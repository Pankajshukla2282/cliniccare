import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ConsultationType } from '@prisma/client';

export class CreateConsultationDto {
  @IsInt()
  patientId!: number;

  @IsInt()
  doctorId!: number;

  @IsOptional()
  @IsInt()
  clinicId?: number;

  @IsOptional()
  @IsInt()
  appointmentId?: number;

  @IsOptional()
  @IsEnum(ConsultationType)
  consultationType?: ConsultationType;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsString()
  history?: string;

  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @IsOptional()
  @IsInt()
  heartRate?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatmentPlanText?: string;

  @IsOptional()
  @IsString()
  examination?: string;

  @IsOptional()
  @IsString()
  investigations?: string;

  @IsOptional()
  @IsString()
  advice?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateConsultationDto {
  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatmentPlanText?: string;

  @IsOptional()
  @IsString()
  examination?: string;

  @IsOptional()
  @IsString()
  investigations?: string;

  @IsOptional()
  @IsString()
  advice?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateMedicalRecordDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsInt()
  doctorId?: number;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsOptional()
  details?: Record<string, unknown>;
}

export class CreatePrescriptionTemplateDto {
  @IsInt()
  organizationId!: number;

  @IsOptional()
  @IsInt()
  doctorId?: number;

  @IsString()
  name!: string;

  @IsArray()
  items!: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PrescriptionFromTemplateDto {
  @IsInt()
  templateId!: number;

  @IsInt()
  patientId!: number;

  @IsInt()
  doctorId!: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;
}

export class ReusePrescriptionDto {
  @IsInt()
  sourcePrescriptionId!: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;
}

export class PrescriptionItemDto {
  @IsOptional()
  @IsInt()
  productId?: number;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class CreatePrescriptionDto {
  @IsInt()
  patientId!: number;

  @IsInt()
  doctorId!: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  prescriptionItems?: PrescriptionItemDto[];
}
