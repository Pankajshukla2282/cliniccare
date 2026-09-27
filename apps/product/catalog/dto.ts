export class CreateCategoryDto {
  organizationId!: number;
  name!: string;
  description?: string;
  parentId?: number;
}

export class CreateProductDto {
  organizationId!: number;
  categoryId!: number;
  name!: string;
  slug!: string;
  description?: string;
  price!: number;
  sku?: string;
  trackInventory?: boolean;
  inventoryQuantity?: number;
  lowStockThreshold?: number;
}