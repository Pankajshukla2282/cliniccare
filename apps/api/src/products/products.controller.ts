import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { ProductsService } from './products.service';
import {
  AdjustInventoryDto,
  CreateProductCategoryDto,
  CreateProductDto,
  CreateVariantDto,
  ProductBatchDto,
  UpdateProductDto,
} from './dto';

@ApiTags('products')
@ApiBearerAuth()
@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Permissions('product.manage')
  @Post('product-categories')
  createCategory(@OrgId() orgId: number, @Body() dto: CreateProductCategoryDto) {
    return this.products.createCategory(orgId, dto);
  }

  @Permissions('product.read')
  @Get('product-categories')
  listCategories(@OrgId() orgId: number) {
    return this.products.listCategories(orgId);
  }

  @Permissions('product.manage')
  @Post('products')
  createProduct(@OrgId() orgId: number, @Body() dto: CreateProductDto) {
    return this.products.createProduct(orgId, dto);
  }

  @Permissions('product.read')
  @Get('products')
  listProducts(
    @OrgId() orgId: number,
    @Query('categoryId') categoryId?: string,
    @Query('featured') featured?: string,
  ) {
    return this.products.listProducts(
      orgId,
      categoryId ? Number(categoryId) : undefined,
      featured === 'true',
    );
  }

  @Permissions('product.read')
  @Get('products/low-stock')
  lowStock(@OrgId() orgId: number) {
    return this.products.lowStock(orgId);
  }

  @Permissions('product.read')
  @Get('products/:id')
  getProduct(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.products.getProduct(id, orgId);
  }

  @Permissions('product.manage')
  @Patch('products/:id')
  updateProduct(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdateProductDto) {
    return this.products.updateProduct(id, orgId, dto);
  }

  @Permissions('product.manage')
  @Post('products/:id/variants')
  createVariant(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: CreateVariantDto) {
    return this.products.createVariant(id, orgId, dto);
  }

  @Permissions('product.manage')
  @Post('products/:id/inventory')
  adjustInventory(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: AdjustInventoryDto) {
    return this.products.adjustInventory(id, orgId, dto);
  }

  @Permissions('product.manage')
  @Post('products/:id/batches')
  createBatch(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: ProductBatchDto) {
    return this.products.createBatch(id, orgId, dto);
  }

  @Permissions('product.read')
  @Get('products/:id/batches')
  listBatches(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.products.listBatches(id, orgId);
  }

  @Permissions('product.read')
  @Get('batches/expiring')
  expiringBatches(
    @OrgId() orgId: number,
    @Query('days') days?: string,
  ) {
    return this.products.expiringBatches(orgId, days ? Number(days) : 90);
  }
}
