import { IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSkinAssessmentDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsOptional()
  @IsInt()
  treatmentPlanId?: number;

  @IsOptional()
  @IsString()
  skinType?: string;

  @IsOptional()
  @IsString({ each: true })
  concerns?: string[];

  @IsOptional()
  @IsString()
  severity?: string;

  @IsDateString()
  assessmentDate!: string;

  @IsOptional()
  @IsString()
  recommendations?: string;
}

export class CreateImageDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsInt()
  treatmentPlanId?: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsOptional()
  @IsString()
  bodyArea?: string;

  @IsOptional()
  @IsString()
  imageType?: string;

  @IsString()
  storagePath!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @IsOptional()
  @IsString()
  doctorNotes?: string;

  @IsOptional()
  @IsBoolean()
  patientConsent?: boolean;
}

export class RecommendProductDto {
  @IsInt()
  doctorId!: number;

  @IsInt()
  patientId!: number;

  @IsInt()
  productId!: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
