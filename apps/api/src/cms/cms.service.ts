import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertPageDto } from './dto';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  upsertPage(organizationId: number, dto: UpsertPageDto) {
    const { organizationId: _ignored, ...rest } = dto;
    return this.prisma.cmsPage.upsert({
      where: { organizationId_slug: { organizationId, slug: dto.slug } },
      create: { organizationId, ...rest, content: (dto.content ?? undefined) as Prisma.InputJsonValue | undefined },
      update: { ...rest, content: (dto.content ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  }

  listPages(organizationId: number) {
    return this.prisma.cmsPage.findMany({ where: { organizationId }, orderBy: { title: 'asc' } });
  }

  async getBySlug(organizationId: number, slug: string) {
    const page = await this.prisma.cmsPage.findFirst({
      where: { organizationId, slug, status: 'PUBLISHED' },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  listArticles(organizationId: number, type?: string) {
    return this.prisma.cmsPage.findMany({
      where: {
        organizationId,
        status: 'PUBLISHED',
        ...(type ? { type } : { type: { in: ['ARTICLE', 'BLOG', 'FAQ'] } }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  upsertFaq(organizationId: number, dto: { question: string; answer: string; category?: string }) {
    const slug = `faq-${dto.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`;
    return this.prisma.cmsPage.upsert({
      where: { organizationId_slug: { organizationId, slug } },
      create: {
        organizationId,
        title: dto.question,
        slug,
        type: 'FAQ',
        content: { question: dto.question, answer: dto.answer, category: dto.category } as any,
        status: 'PUBLISHED',
      },
      update: {
        content: { question: dto.question, answer: dto.answer, category: dto.category } as any,
      },
    });
  }

  listFaqs(organizationId: number) {
    return this.prisma.cmsPage.findMany({
      where: {
        organizationId,
        type: 'FAQ',
        status: 'PUBLISHED',
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
