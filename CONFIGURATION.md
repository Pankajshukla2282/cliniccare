# ClinicCare Configuration

ClinicCare uses environment-driven configuration. Do not hard-code environment-specific URLs, ports, credentials, tenant domains, or integration endpoints in application source.

## Files

- `.env.example`: shared local/deployment variable catalog.
- `apps/api/.env.example`: API-specific variables.
- `apps/web/.env.example`: Next.js-specific variables.
- `prisma/.env.example`: Prisma CLI database variable.
- `prisma.config.ts`: Prisma schema/migration configuration.
- `apps/api/src/config.ts`: normalized API runtime configuration.
- `apps/web/lib/config.ts`: normalized Web runtime/build configuration.
- `.nvmrc`: required Node.js version.

For local development, copy the relevant `.env.example` files to `.env` in the corresponding module. The Windows `start-dev.ps1` script also supports a repository-root `.env` and propagates those values to child processes.

## Important variables

`APP_ENV`, `DEPLOYMENT_NAMESPACE`, `API_HOST`, `API_PORT`, `API_BASE_PATH`, `WEB_ORIGIN`, `DATABASE_URL`, `WEB_HOST`, `WEB_PORT`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_PATH`, `TENANT_BASE_DOMAIN`, `TENANT_QUERY_PARAM`, `DEFAULT_TENANT_SLUG`, and `K8S_NAMESPACE` are environment-controlled. Redis is optional infrastructure and is not required by the current API runtime.

Secrets such as `DATABASE_URL`, `JWT_SECRET`, provider credentials, and AWS credentials must never be committed.
