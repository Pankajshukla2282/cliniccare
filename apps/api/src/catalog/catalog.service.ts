import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto, CreateServiceDto, UpdateServiceDto } from './dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  createCategory(organizationId: number, dto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.upsert({
      where: { organizationId_name: { organizationId, name: dto.name } },
      create: { ...dto, organizationId },
      update: { description: dto.description },
    });
  }

  listCategories(organizationId: number) {
    return this.prisma.serviceCategory.findMany({
      where: { organizationId },
      include: { services: true },
      orderBy: { name: 'asc' },
    });
  }

  createService(organizationId: number, dto: CreateServiceDto) {
    const { faqs, ...rest } = dto;
    return this.prisma.service.create({
      data: { ...rest, organizationId, faqs: (faqs ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  }

  listServices(organizationId: number, categoryId?: number) {
    return this.prisma.service.findMany({
      where: { organizationId, ...(categoryId ? { categoryId } : {}) },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateService(id: number, organizationId: number, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id, organizationId } });
    if (!service) throw new NotFoundException('Service not found');
    const { faqs, ...rest } = dto;
    return this.prisma.service.update({
      where: { id },
      data: { ...rest, faqs: (faqs ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  }
}
