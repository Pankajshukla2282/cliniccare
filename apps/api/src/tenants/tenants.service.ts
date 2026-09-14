import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivateTenantDto, UpdateTenantDto } from './tenants.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  private async mustGet(id: number) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Tenant not found');
    return org;
  }

  list(filters: { status?: string; plan?: string; search?: string; skip: number; take: number }) {
    const searchWhere = filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' as const } },
            { slug: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    return this.prisma.organization.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.plan ? { plan: filters.plan } : {}),
        ...searchWhere,
      },
      orderBy: { id: 'desc' },
      skip: filters.skip,
      take: Math.min(filters.take, 100),
    });
  }

  async get(id: number) {
    const org = await this.mustGet(id);
    const [clinics, users, patients] = await Promise.all([
      this.prisma.clinic.count({ where: { organizationId: id } }),
      this.prisma.user.count({ where: { organizationId: id } }),
      this.prisma.patient.count({ where: { organizationId: id } }),
    ]);
    return { ...org, stats: { clinics, users, patients } };
  }

  async update(id: number, dto: UpdateTenantDto) {
    await this.mustGet(id);
    const data = { ...dto } as Record<string, unknown>;
    if (dto.trialEndsAt) data.trialEndsAt = new Date(dto.trialEndsAt);
    if (dto.subRenewsAt) data.subRenewsAt = new Date(dto.subRenewsAt);
    return this.prisma.organization.update({ where: { id }, data });
  }

  async activate(id: number, dto?: ActivateTenantDto) {
    await this.mustGet(id);
    return this.prisma.organization.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        plan: dto?.plan ?? undefined,
        onboardingCompleted: true,
        onboardedAt: new Date(),
      },
    });
  }

  async suspend(id: number) {
    await this.mustGet(id);
    return this.prisma.organization.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }
}