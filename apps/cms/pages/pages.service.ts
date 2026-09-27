import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../api/prisma/prisma.service';

@Injectable()
export class PagesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createPage(organizationId: number, dto: { title: string; slug: string; type?: string; content?: any; metaTitle?: string; metaDescription?: string; status?: string }) {
    const { title, slug, type, content, metaTitle, metaDescription, status } = dto;

    return this.prisma.cmsPage.create({
      data: {
        organizationId,
        title,
        slug,
        type,
        content,
        metaTitle,
        metaDescription,
        status: status || 'PUBLISHED',
      },
    });
  }

  async getPage(organizationId: number, slug: string) {
    return this.prisma.cmsPage.findFirst({
      where: { organizationId, slug },
    });
  }

  async listPages(organizationId: number, status?: string) {
    return this.prisma.cmsPage.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updatePage(organizationId: number, slug: string, dto: { title?: string; content?: any; metaTitle?: string; metaDescription?: string; status?: string }) {
    return this.prisma.cmsPage.update({
      where: { organizationId, slug },
      data: {
        title: dto.title,
        content: dto.content,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        status: dto.status,
      },
    });
  }

  async deletePage(organizationId: number, slug: string) {
    return this.prisma.cmsPage.delete({
      where: { organizationId, slug },
    });
  }
}