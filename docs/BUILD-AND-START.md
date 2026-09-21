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

The API uses the `bcryptjs` runtime package and a single Express 5 type definition at the workspace root. Do not add `@types/express` 4.x to the API workspace and do not add custom recursive Express type declarations.
