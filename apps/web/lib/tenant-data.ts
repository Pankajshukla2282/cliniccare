import { cache } from 'react';

export type Tenant = {
  id: number;
  name: string;
  slug: string;
  settings: unknown;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

/**
 * Resolve the current tenant through the NestJS API.
 *
 * The web application deliberately does not import Prisma or any API source
 * files. This keeps the Next.js bundle independent from the API's generated
 * Prisma client and database runtime.
 */
export const getTenantBySubdomain = cache(async (subdomain: string): Promise<Tenant | null> => {
  const slug = subdomain.trim().toLowerCase();
  if (!slug) return null;

  const response = await fetch(
    `${apiUrl.replace(/\/$/, '')}/api/v1/public/tenant/${encodeURIComponent(slug)}`,
    {
      headers: {
        Accept: 'application/json',
      },
      next: {
        revalidate: 60,
        tags: [`tenant:${slug}`],
      },
    },
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Tenant lookup failed with HTTP ${response.status}`);
  }

  return (await response.json()) as Tenant;
});
