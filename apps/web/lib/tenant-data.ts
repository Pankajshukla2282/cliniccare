import { cache } from 'react';
import { webConfig } from './config';

export type Tenant = {
  id: number;
  name: string;
  slug: string;
  settings: unknown;
};

const apiUrl = webConfig.apiUrl;

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
    `${apiUrl.replace(/\/$/, '')}${webConfig.apiBasePath}/public/tenant/${encodeURIComponent(slug)}`,
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
