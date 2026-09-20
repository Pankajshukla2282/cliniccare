import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('public/tenant')
export class TenantController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':slug')
  async getTenant(@Param('slug') slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        email: true,
        phone: true,
        website: true,
        plan: true,
        status: true,
        settings: true
      }
    });
    if (!organization) throw new NotFoundException('Tenant not found');
    return organization;
  }
}
