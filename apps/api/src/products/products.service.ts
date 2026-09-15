import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustInventoryDto,
  CreateProductCategoryDto,
  CreateProductDto,
  CreateVariantDto,
  ProductBatchDto,
  UpdateProductDto,
} from './dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  createCategory(organizationId: number, dto: CreateProductCategoryDto) {
    return this.prisma.productCategory.upsert({
      where: { organizationId_name: { organizationId, name: dto.name } },
      create: { ...dto, organizationId },
      update: { description: dto.description, parentId: dto.parentId },
    });
  }

  listCategories(organizationId: number) {
    return this.prisma.productCategory.findMany({
      where: { organizationId },
      include: { children: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  createProduct(organizationId: number, dto: CreateProductDto) {
    const { images, ...rest } = dto;
    return this.prisma.product.create({
      data: { ...rest, organizationId, images: images ?? [] },
    });
  }

  listProducts(organizationId: number, categoryId?: number, featuredOnly = false) {
    return this.prisma.product.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(categoryId ? { categoryId } : {}),
        ...(featuredOnly ? { isFeatured: true } : {}),
      },
      include: { category: true, variants: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProduct(id: number, organizationId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: { category: true, variants: true, inventoryTx: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(id: number, organizationId: number, dto: UpdateProductDto) {
    await this.getProduct(id, organizationId);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async createVariant(productId: number, organizationId: number, dto: CreateVariantDto) {
    await this.getProduct(productId, organizationId);
    return this.prisma.productVariant.create({
      data: {
        productId,
        ...dto,
        attributes: (dto.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  adjustInventory(productId: number, organizationId: number, dto: AdjustInventoryDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId, organizationId } });
      if (!product) throw new NotFoundException('Product not found');
      const newQuantity = product.inventoryQuantity + dto.quantity;
      if (newQuantity < 0) throw new BadRequestException('Insufficient stock');
      const updated = await tx.product.update({
        where: { id: productId },
        data: { inventoryQuantity: newQuantity },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId,
          type: dto.quantity >= 0 ? 'IN' : 'OUT',
          quantity: dto.quantity,
          previousQuantity: product.inventoryQuantity,
          newQuantity,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          notes: dto.notes,
        },
      });
      return updated;
    });
  }

  async createBatch(productId: number, organizationId: number, dto: ProductBatchDto) {
    await this.getProduct(productId, organizationId);
    return this.prisma.productBatch.upsert({
      where: { productId_batchNumber: { productId, batchNumber: dto.batchNumber } },
      create: {
        productId,
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        quantity: dto.quantity ?? 0,
        notes: dto.notes,
      },
      update: {
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        quantity: dto.quantity ?? 0,
        notes: dto.notes,
      },
    });
  }

  listBatches(productId: number, organizationId: number) {
    return this.prisma.productBatch.findMany({
      where: { productId, product: { organizationId } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  expiringBatches(organizationId: number, days = 90) {
    const horizon = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.productBatch.findMany({
      where: {
        product: { organizationId },
        expiryDate: { lte: horizon },
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  lowStock(organizationId: number) {
    return this.prisma.$queryRawUnsafe(
      'SELECT id, name, sku, "inventoryQuantity", "lowStockThreshold" FROM products WHERE "organizationId" = $1 AND status = $2 AND "trackInventory" = true AND "inventoryQuantity" <= "lowStockThreshold" ORDER BY "inventoryQuantity" ASC',
      organizationId,
      'ACTIVE',
    );
  }
}
