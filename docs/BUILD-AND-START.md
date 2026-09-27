# ClinicCare Microservice Build & Start Guide

## Required Runtime

Use the versions declared in `.nvmrc` and `package.json`:
- **Node**: 24.21.0
- **npm**: 11.x

The repository uses **npm workspaces** with 9 microservices under `apps/`:
- `apps/api` - Main NestJS API entry point
- `apps/auth` - Auth microservice (JWT, tenants, RBAC)
- `apps/clinical` - Clinical microservice (patients, appointments)
- `apps/billing` - Billing microservice (orders, payments)
- `apps/product` - Product/Catalog microservice
- `apps/queue` - Queue ticket microservice
- `apps/lab` - Lab/Reports microservice
- `apps/cms` - CMS/Engagement microservice
- `apps/web` - Next.js frontend

## Validation

```powershell
npm ci              # Install all workspace packages (preferred) 
npm run prisma:validate   # Validate Prisma schema
npm run db:generate   # Generate Prisma clients (all 9 services)
npm run typecheck:api   # Typecheck API + auth services
npm run typecheck:web   # Typecheck Next.js web
npm run lint          # Lint all TypeScript sources
```

## Build

```powershell
npm run build:all
```

Or build individual services:

```powershell
npm run build:api      # Build API + auth
npm run build:clinical # Build clinical service
npm run build:billing  # Build billing service
npm run build:product  # Build product service
npm run build:queue    # Build queue service
npm run build:lab      # Build lab service
npm run build:cms      # Build CMS service
npm run build:web      # Build Next.js web app
```

### Build Details

```text
npm ci                # Fresh install from lockfile (preferred over npm install)
  -> Installs all workspace packages: @cliniccare/*

npm run prisma:validate   # Validate Prisma schema against PostgreSQL
  -> Checks schema compatibility, reports errors

npm run db:generate   # Generate Prisma Client for all services
  -> Outputs to apps/*/src/generated/prisma/
  -> Uses prisma.config.ts per service

npm run typecheck:api   # tsc -p apps/api/tsconfig.json --noEmit
  -> Also typechecks apps/auth/ (shared dependencies)

npm run typecheck:web   # tsc -p apps/web/tsconfig.json --noEmit

npm run lint:api      # eslint "apps/api/src/**/*.ts"
npm run lint:auth     # eslint "apps/auth/src/**/*.ts"
npm run lint:clinical # eslint "apps/clinical/src/**/*.ts"
npm run lint:billing  # eslint "apps/billing/src/**/*.ts"
npm run lint:product  # eslint "apps/product/src/**/*.ts"
npm run lint:queue    # eslint "apps/queue/src/**/*.ts"
npm run lint:lab      # eslint "apps/lab/src/**/*.ts"
npm run lint:cms      # eslint "apps/cms/src/**/*.ts"
npm run lint:web      # eslint "apps/web/**/*.{ts,tsx,js,mjs}"

npm run build:api     # tsc -p apps/api/tsconfig.build.json && node --watch dist/main.js
npm run build:clinical# builds each service's TypeScript + outputs dist/
npm run build:web     # next build - or tsc build per config
```

## Seed

```powershell
npm run db:seed
```

### Seed Details

```text
The seed is idempotent and safe to run repeatedly.
Uses tenant slugs/natural keys instead of fixed database IDs.

For development:
$env:APP_ENV='development'
$env:SEED_TENANT_SLUG='cliniccare-demo'
npm run db:seed

For staging/demo data:
$env:APP_ENV='staging'
$env:SEED_TENANT_SLUG='cliniccare-staging-demo'
$env:SEED_ALLOW_DEMO='true'
npm run db:seed

⚠️ Demo seeding is blocked in production unless explicitly enabled via $env:ALLOW_PROD_SEED='true'
```

## Start

```powershell
# Use local PostgreSQL (auto-detects if K8s cluster is unreachable)
$env:DEV_INFRA_MODE='local'

# Start all required services (PostgreSQL + API + Web)
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1

# Or Unix/macOS:
DEV_INFRA_MODE=local bash scripts/start.sh
```

### Start Details

```text
The launcher starts only the services required by the current runtime:

- PostgreSQL (local or Kubernetes port-forward)
- NestJS API service (apps/api or apps/auth as needed)
- Next.js Web app (apps/web)
- Optionally: Redis (for future jobs/cache work - not required by current API runtime)

If Kubernetes cluster is reachable, the launcher can use `DEV_INFRA_MODE=k8s` which mandates K8s infrastructure.

Common failures and fixes:

### Kubernetes refused connection

```powershell
$env:DEV_INFRA_MODE='local'
```

Use local infrastructure when K8s cluster is unreachable.

### API build says `dist/main.js` is missing

```powershell
# Use the development launcher. It starts `tsx watch src/main.ts`
# It does not require an existing `dist` directory.

$env:DEV_INFRA_MODE='local'
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

### bcryptjs / Express types

The API uses `bcryptjs` and explicitly declares `@types/bcryptjs` plus Express 5 `@types/express` in `apps/api/package.json`. This keeps API typechecking reliable even when a developer machine has `npm config omit=dev` configured.

⚠️ **Do not add Express 4 types or custom recursive Express declarations.**

### npm dependency installation

ClinicCare builds require the TypeScript/Prisma toolchain. The API keeps its bcryptjs and Express type declarations in the API dependency set so `npm run typecheck:api` remains reliable even if a machine has `npm config omit=dev` configured.

```powershell
# If you intentionally keep omit=dev:
npm config delete omit
npm ci --include=dev   # For build/test work only

# Or normal install (recommended):
npm config delete omit
npm ci                 # Standard install with devDependencies
```

## Microservice-Specific Startup

Each microservice can be started individually:

```powershell
# Auth service only
$env:DEV_INFRA_MODE='local'
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 --auth-only

# Clinical service only
$env:DEV_INFRA_MODE='local'
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1 --clinical-only

# Or via npm scripts:
npm run dev:auth
npm run dev:clinical
npm run dev:billing
npm run dev:product
npm run dev:queue
npm run dev:lab
npm run dev:cms
npm run dev:web
```