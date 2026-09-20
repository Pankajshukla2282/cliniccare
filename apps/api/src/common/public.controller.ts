import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('public')
@Controller()
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('public/tenant/:slug')
  async getTenant(@Param('slug') slug: string) {
    const tenant = await this.prisma.organization.findFirst({
      where: {
        slug: slug.trim().toLowerCase(),
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  @Public()
  @Get('public/doctors')
  async listDoctors(@Query('organizationId', ParseIntPipe) organizationId: number) {
    return this.prisma.doctor.findMany({
      where: {
        status: 'ACTIVE',
        clinic: { organizationId },
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        specialties: { include: { specialty: true } },
        services: { include: { service: true } },
      },
    });
  }

  @Public()
  @Get('public/doctors/:id')
  async getDoctor(@Param('id', ParseIntPipe) id: number, @Query('organizationId', ParseIntPipe) organizationId: number) {
    return this.prisma.doctor.findFirst({
      where: { id, status: 'ACTIVE', clinic: { organizationId } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        specialties: { include: { specialty: true } },
        services: { include: { service: true } },
        schedules: true,
        reviews: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  @Public()
  @Get('public/services')
  async listServices(@Query('organizationId', ParseIntPipe) organizationId: number) {
    return this.prisma.service.findMany({
      where: {
        status: 'ACTIVE',
        organizationId,
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  @Public()
  @Get('public/testimonials')
  async listTestimonials(@Query('organizationId', ParseIntPipe) organizationId: number) {
    return this.prisma.review.findMany({
      where: {
        status: 'APPROVED',
        patient: { organizationId },
      },
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true } } } },
        doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        service: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  @Public()
  @Get('public/specialties')
  async listSpecialties() {
    return this.prisma.specialty.findMany({ orderBy: { name: 'asc' } });
  }

  @Public()
  @Get('public/packages')
  async listPackages(@Query('organizationId', ParseIntPipe) organizationId: number) {
    return this.prisma.package.findMany({
      where: {
        status: 'ACTIVE',
        organizationId,
      },
      orderBy: { name: 'asc' },
    });
  }
}
