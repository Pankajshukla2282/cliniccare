const nodeEnv = process.env.NODE_ENV ?? 'development';
const environment = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? nodeEnv;
const isProduction = nodeEnv === 'production';
const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? (isProduction ? '' : 'http://localhost:3100')).replace(/\/$/, '');
if (isProduction && !apiUrl) throw new Error('NEXT_PUBLIC_API_URL is required in production');

export const webConfig = {
  nodeEnv,
  environment,
  isProduction,
  apiUrl,
  apiBasePath: (process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1').replace(/^\/?/, '/').replace(/\/$/, ''),
  tenantSlug: process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'cliniccare-demo',
  tenantBaseDomain: process.env.TENANT_BASE_DOMAIN ?? (isProduction ? '' : 'localhost'),
  tenantQueryParam: process.env.TENANT_QUERY_PARAM ?? 'tenant',
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG ?? process.env.NEXT_PUBLIC_TENANT_SLUG ?? 'cliniccare-demo',
  port: Number(process.env.WEB_PORT ?? process.env.PORT ?? 3000),
  host: process.env.WEB_HOST ?? '127.0.0.1',
  logDir: process.env.LOG_DIR ?? 'logs',
  logLevel: process.env.LOG_LEVEL ?? 'info',
} as const;
