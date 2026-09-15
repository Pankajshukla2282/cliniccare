import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { NotificationChannel } from '../generated/prisma/client';

export class CreateTemplateDto {
  @IsOptional()
  @IsInt()
  organizationId?: number;

  @IsString()
  name!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  content!: string;
}

export class SendNotificationDto {
  @IsInt()
  recipientUserId!: number;

  @IsOptional()
  @IsInt()
  templateId?: number;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  content!: string;
}
