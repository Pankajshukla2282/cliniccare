# Build and Start Guide

## Required runtime

Use the versions declared in `.nvmrc` and `package.json` (Node 24.21.0 and npm 11.x).

## Validate

```powershell
npm ci
npm run prisma:validate
npm run db:generate
npm run typecheck:api
npm run typecheck:web
```

## Build

```powershell
npm run build:all
```

## Seed

```powershell
npm run db:seed
```

The seed is safe to run repeatedly and uses tenant slugs/natural keys instead of fixed database IDs.

## Start

```powershell
$env:DEV_INFRA_MODE='local'
.
\scripts\start-dev.ps1
```

or:

```bash
DEV_INFRA_MODE=local bash scripts/start-dev.sh
```

The launcher starts only the services required by the current runtime: PostgreSQL (local or Kubernetes port-forward), NestJS API and Next.js Web. Redis is optional infrastructure at present.

## Common failures

### Kubernetes refused connection

Use local infrastructure:

```powershell
$env:DEV_INFRA_MODE='local'
```

### API build says `dist/main.js` is missing

Use the development launcher. It starts `tsx watch src/main.ts`; it does not require an existing `dist` directory.

### bcryptjs / Express types

The API uses `bcryptjs` and explicitly declares `@types/bcryptjs` plus Express 5 `@types/express` in `apps/api/package.json`. This keeps API typechecking reliable even when a developer machine has npm configured with `omit=dev`. Do not add Express 4 types or custom recursive Express declarations.


### npm dependency installation

ClinicCare builds require the TypeScript/Prisma toolchain. The API keeps its bcryptjs and Express type declarations in the API dependency set so `npm run typecheck:api` remains reliable even if a machine has `npm config omit=dev` configured. Prefer normal installs with development dependencies available for the full build:

```powershell
npm config delete omit
npm ci
```

If you intentionally keep `omit=dev`, use `npm ci --include=dev` for build/test work.
