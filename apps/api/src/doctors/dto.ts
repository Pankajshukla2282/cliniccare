import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { DoctorStatus } from '@prisma/client';

export class UpdateDoctorDto {
  @IsOptional()
  @IsInt()
  clinicId?: number;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  certifications?: string;

  @IsOptional()
  @IsString({ each: true })
  consultationTypes?: string[];

  @IsOptional()
  @IsBoolean()
  onlineAvailable?: boolean;

  @IsOptional()
  @IsInt()
  slotBufferMinutes?: number;

  @IsOptional()
  @IsNumber()
  consultationFee?: number;

  @IsOptional()
  @IsInt()
  experienceYears?: number;

  @IsOptional()
  @IsEnum(DoctorStatus)
  status?: DoctorStatus;
}

export class CreateSpecialtyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class AssignSpecialtyDto {
  @IsInt()
  specialtyId!: number;
}

export class UpsertScheduleDto {
  @IsOptional()
  @IsInt()
  clinicId?: number;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  breakStart?: string;

  @IsOptional()
  @IsString()
  breakEnd?: string;

  @IsOptional()
  @IsBoolean()
  isWorkingDay?: boolean;
}

export class CreateLeaveDto {
  @IsString()
  date!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class LinkServiceDto {
  @IsInt()
  serviceId!: number;

  @IsOptional()
  @IsNumber()
  feeOverride?: number;
}
