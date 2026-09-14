import { headers } from 'next/headers';

import { Badge } from '@/components/ui/badge';
import { getTenantBySubdomain } from '@/lib/tenant-data';

export async function TenantBanner() {
  const subdomain = headers().get('x-tenant-subdomain');
  if (!subdomain) return null;
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant) return null;
  return (
    <Badge variant="outline" className="hidden sm:inline-flex">
      {tenant.name}
    </Badge>
  );
}