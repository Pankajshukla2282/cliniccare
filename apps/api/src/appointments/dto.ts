import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus, ConsultationType } from '@prisma/client';

export class BookAppointmentDto {
  @IsInt()
  patientId!: number;

  @IsInt()
  doctorId!: number;

  @IsOptional()
  @IsInt()
  clinicId?: number;

  @IsOptional()
  @IsInt()
  serviceId?: number;

  @IsDateString()
  appointmentDate!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsEnum(ConsultationType)
  type?: ConsultationType;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString()
  appointmentDate!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SlotQueryDto {
  @IsInt()
  doctorId!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsInt()
  serviceId?: number;
}
