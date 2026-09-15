import { PrismaClient } from '../../api/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { cache } from 'react';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }) });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// cache() dedupes within a single request: layout metadata, layout render, and
// the page all call this but only one DB query runs.
export const getTenantBySubdomain = cache(async (subdomain: string) => {
  return prisma.organization.findUnique({
    where: { slug: subdomain },
    select: { id: true, name: true, slug: true, settings: true },
  });
});