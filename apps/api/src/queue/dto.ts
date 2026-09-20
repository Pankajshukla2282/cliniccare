import { IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateQueueTicketDto {
  @IsInt() patientId!: number;
  @IsInt() clinicId!: number;
  @IsOptional() @IsInt() appointmentId?: number;
  @IsOptional() @IsString() @MaxLength(80) queueType?: string;
  @IsOptional() @IsDateString() serviceDate?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
