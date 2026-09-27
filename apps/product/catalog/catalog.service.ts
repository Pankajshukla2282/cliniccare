import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../api/prisma/prisma.service';
import { CreateCategoryDto, CreateProductDto } from './dto';

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createCategory(organizationId: number, dto: CreateCategoryDto) {
    return this.prisma.productCategory.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
      },
    });
  }

  async listCategories(organizationId: number) {
    return this.prisma.productCategory.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async getCategory(id: number) {
    const category = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async createProduct(organizationId: number, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        organizationId,
        categoryId: dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        price: dto.price,
        sku: dto.sku,
        trackInventory: dto.trackInventory ?? true,
        inventoryQuantity: dto.inventoryQuantity ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? 10,
      },
    });
  }

  async listProducts(organizationId: number, categoryId?: number) {
    return this.prisma.product.findMany({
      where: {
        organizationId,
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProduct(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}