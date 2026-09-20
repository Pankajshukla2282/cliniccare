import { NextRequest, NextResponse } from 'next/server';
import { webConfig } from './lib/config';

const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function hostname(rawHost: string): string {
  let host = rawHost.toLowerCase();

  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end !== -1) host = host.slice(1, end);
  } else {
    host = host.split(':')[0];
  }

  return host;
}

function tenantFromHost(host: string): string | null {
  if (!host || DEV_HOSTS.has(host)) return null;

  const baseDomain = webConfig.tenantBaseDomain.toLowerCase().trim().replace(/^\.|\.$/g, '');
  if (baseDomain && host !== baseDomain && !host.endsWith(`.${baseDomain}`)) return null;

  const first = host.split('.')[0];
  if (!first || first === 'www' || first === 'app') return null;

  return /^[a-z0-9-]+$/.test(first) ? first : null;
}

export function proxy(req: NextRequest) {
  const host = hostname(req.headers.get('host') ?? '');
  let subdomain = tenantFromHost(host);

  // Development convenience: http://localhost:<WEB_PORT>?<TENANT_QUERY_PARAM>=<slug>
  if (!subdomain && DEV_HOSTS.has(host)) {
    const tenant = req.nextUrl.searchParams.get(webConfig.tenantQueryParam);
    subdomain = tenant && /^[a-z0-9-]+$/.test(tenant) ? tenant.toLowerCase() : null;
  }

  if (!subdomain) return NextResponse.next();

  // Forward the tenant header to the Server Components/request context.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-subdomain', subdomain);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)'],
};
