# ClinicCare apps build fixes

## What was fixed

- Removed the Next.js dependency on `apps/api/src/generated/prisma/client`.
- Tenant lookup now goes through the public NestJS API endpoint:
  `/api/v1/public/tenant/:slug`.
- Added the public tenant endpoint to the NestJS API.
- Updated Next.js request-header usage for Next.js 15/16 (`await headers()`).
- Removed duplicate/obsolete Next.js experimental configuration and the webpack dev-server proxy.
- Removed unused Prisma packages from `apps/web/package.json`.
- Removed stale `.next` and `api/dist` build artifacts from this package.
- Added app-level `.gitignore` files.

## Clean install

From the repository root, remove the existing dependencies and reinstall from the
repository's lockfile/workspace configuration. The uploaded package contained
`next@16.3.3`, while the previous build output showed `Next.js 14.2.35`, which
indicates a stale `node_modules` installation.

Then run:

```powershell
npm install
npm run build
```

The API must be running using `API_URL` / `NEXT_PUBLIC_API_URL` when the Next.js server renders
tenant data.

The web application now communicates with the API instead of importing Prisma
directly, so Prisma/database runtime code stays inside `apps/api`.

## 2026-09-22 multi-tenant/environment cleanup

- API now uses the official `bcryptjs` declarations through the root workspace; the custom `bcryptjs.d.ts` shim was removed.
- Express type definitions are centralized on `@types/express` 5.x at the workspace root; the conflicting API-local Express 4 types were removed.
- Public tenant-aware endpoints resolve the tenant from a slug instead of trusting a raw organization ID as the primary context.
- The development launchers treat Kubernetes as optional and no longer require Redis, because the current API does not use a Redis runtime dependency.
- Seed data is idempotent, avoids hard-coded clinic IDs, creates representative RBAC/staff/patient/catalog data, and demonstrates one user belonging to two tenants.
- Environment configuration is explicit through `APP_ENV`, `DEPLOYMENT_NAMESPACE`, and environment-specific tenant slugs.
