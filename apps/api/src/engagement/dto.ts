import { IsDateString, IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateFollowUpDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsInt()
  doctorId?: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsString()
  reason!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteFollowUpDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReviewDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsInt()
  doctorId?: number;

  @IsOptional()
  @IsInt()
  serviceId?: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ModerateReviewDto {
  @IsString()
  status!: string;
}

export class CreateLeadDto {
  @IsInt()
  organizationId!: number;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  interest?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  convertedPatientId?: number;
}
