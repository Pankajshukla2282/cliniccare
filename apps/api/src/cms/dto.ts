import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertPageDto {
  @IsInt()
  organizationId!: number;

  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  type!: string;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;
}

export class FaqDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsOptional()
  @IsString()
  category?: string;
}
