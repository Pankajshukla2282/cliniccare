import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '../generated/prisma/client';

export class CreateDocumentDto {
  @IsOptional()
  @IsInt()
  patientId?: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsString()
  ownerType!: string;

  @IsInt()
  ownerId!: number;

  @IsString()
  title!: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsString()
  storagePath!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsInt()
  uploadedBy?: number;
}

export class RecordConsentDto {
  @IsInt()
  patientId!: number;

  @IsOptional()
  @IsInt()
  documentId?: number;

  @IsString()
  type!: string;

  @IsBoolean()
  given!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class WithdrawConsentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
