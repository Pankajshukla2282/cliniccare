import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Resolve public tenant context without trusting a raw tenant id from the client.
 * Slugs are the canonical public identifier; organizationId remains a temporary
 * backwards-compatible fallback for existing clients.
 */
export async function resolvePublicOrganizationId(
  prisma: PrismaService,
  tenantSlug?: string,
  legacyOrganizationId?: number,
): Promise<number> {
  const slug = tenantSlug?.trim().toLowerCase();
  if (legacyOrganizationId !== undefined && (!Number.isInteger(legacyOrganizationId) || legacyOrganizationId < 1)) {
    throw new BadRequestException('organizationId must be a positive integer');
  }
  if (!slug && !legacyOrganizationId) {
    throw new BadRequestException('tenant is required');
  }

  const tenant = await prisma.organization.findFirst({
    where: slug
      ? { slug, status: 'ACTIVE' }
      : { id: legacyOrganizationId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!tenant) throw new NotFoundException('Tenant not found');
  return tenant.id;
}
