export class CreatePageDto {
  organizationId!: number;
  title!: string;
  slug!: string;
  type?: string;
  content?: any;
  metaTitle?: string;
  metaDescription?: string;
  status?: string;
}