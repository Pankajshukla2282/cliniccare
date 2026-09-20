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

The API must be running on `http://localhost:3100` when the Next.js server renders
tenant data.

The web application now communicates with the API instead of importing Prisma
directly, so Prisma/database runtime code stays inside `apps/api`.
