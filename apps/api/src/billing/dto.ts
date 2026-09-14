import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  @IsOptional()
  @IsInt()
  orderId?: number;

  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsInt()
  appointmentId?: number;

  @IsOptional()
  @IsInt()
  treatmentPlanId?: number;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRefundDto {
  @IsInt()
  paymentId!: number;

  @IsOptional()
  @IsInt()
  orderId?: number;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsInt()
  orderId?: number;

  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsInt()
  doctorId?: number;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsNumber()
  tax?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
