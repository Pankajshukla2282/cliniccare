import { NextRequest, NextResponse } from 'next/server';

const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

type HostName = {
  host: string;
  // raw host label before any port / IPv6 brackets
  label: string;
};

function label(rawHost: string): string {
  let h = rawHost.toLowerCase();
  if (h.startsWith('[')) {
    const end = h.indexOf(']');
    if (end !== -1) h = h.slice(1, end);
  } else {
    h = h.split(':')[0];
  }
  return h;
}

// First host label is the tenant: acme.localhost / acme.cliniccare.app
function slugFromLabel(host: string): string | null {
  if (DEV_HOSTS.has(host)) return null;
  const first = host.split('.')[0];
  if (!first || first === 'www' || first === 'app') return null;
  return /^[a-z0-9-]+$/.test(first) ? first : null;
}

export function middleware(req: NextRequest) {
  // Read the raw Host header — nextUrl.hostname reflects the socket address
  // when behind a proxy or when the client uses an IP with a Host override.
  const host = label(req.headers.get('host') ?? '');
  let subdomain = slugFromLabel(host);

  // Dev-only convenience: http://localhost:3000?tenant=cliniccare-demo
  if (!subdomain && DEV_HOSTS.has(host)) {
    const q = req.nextUrl.searchParams.get('tenant');
    subdomain = q && /^[a-z0-9-]+$/.test(q) ? q.toLowerCase() : null;
  }

  if (!subdomain) return NextResponse.next();

  const res = NextResponse.next();
  res.headers.set('x-tenant-subdomain', subdomain);
  return res;
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)'],
};