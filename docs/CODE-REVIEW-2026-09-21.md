# ClinicCare Code Review & Development Fixes — 2026-09-21

## Scope
Reviewed the supplied ClinicCare monorepo, including the NestJS API, Next.js web app, development launch scripts, local runbook, and the client-approval wireframe.

## Key findings and fixes

### 1. Web development startup failure
- `scripts/start-dev.ps1` passed the obsolete `--include=dev` option to `next dev`.
- This is not a supported Next.js dev-server option and can prevent the web process from starting.
- The duplicate `apps/web/next.config.js` also caused Next.js to detect configuration changes while `next.config.mjs` was the intended configuration.
- Fixed by removing the duplicate config and passing only `--hostname` and `--port`.

### 2. Development API startup was unnecessarily dependent on `dist/`
- The Windows launcher required `apps/api/dist/main.js` before starting local development.
- This created a stale-build/missing-build failure mode.
- The development launcher now uses the API workspace's `tsx watch` script, matching the normal development workflow.

### 3. Missing POSIX development launcher
- Added `scripts/start-dev.sh` for Linux/macOS/WSL/Git Bash.
- It validates Kubernetes, starts PostgreSQL and Redis port-forwards when needed, starts API and web, waits for both health endpoints, writes logs, and cleans up child processes on exit.
- Added npm aliases: `start-dev:unix` and `start-dev:windows`.

### 4. Runbook drift
- Corrected API/web port references in `docs/runbook-local.md`.
- Removed the reference to the duplicate `next.config.js`.
- Added one-command startup instructions for both launcher variants.

### 5. Generated/duplicated/runtime files
Removed from the distributable source tree:
- duplicate `apps/web/next.config.js`
- Prisma generated client under `apps/api/src/generated`
- `apps/api/dist`
- `apps/web/.next`
- workspace `node_modules`
- runtime logs
- TypeScript build-info artifacts
- stale `tsc-files.txt`
- local `.env` files containing environment-specific values

These should be regenerated locally/CI and must not be treated as source.

### 6. Functional client-approval wireframe
Rebuilt `docs/ClinicCare_Client_Approval_Pack/wireframe/index.html` as a standalone, dependency-free demo.

The demo now covers the application domains represented by the API:
- Dashboard
- Patients
- Appointments and queue
- Clinical consultations, prescriptions, medical records and teleconsult room
- Treatments and packages
- Laboratory
- Billing, payments and refunds
- Orders, cart and checkout
- Products, inventory and low-stock workflows
- Services/catalog
- Doctors, specialties and schedules
- Organizations, clinics, rooms and holidays
- Leads, follow-ups and reviews
- Documents and consents
- Skin assessments, treatment images and recommendations
- Notifications and templates
- Users and RBAC
- CMS pages, articles and FAQs
- Reports and global search
- Audit and idempotency visibility
- Tenant settings

The demo persists state in browser `localStorage`, supports reset/export actions, and uses per-submission idempotency keys so repeated UI events do not create duplicate records.

## Validation performed
- `bash -n scripts/start-dev.sh` — passed.
- Extracted wireframe JavaScript and ran `node --check` — passed.
- Verified only `apps/web/next.config.mjs` remains.
- Verified local `.env`, generated Prisma client, build output, Next build output, logs and node_modules are excluded from the clean deliverable.
- Full npm build/typecheck was not executed in this environment because the supplied project requires Node 24.21.0 / npm 11.x while the review runtime provides Node 22.x / npm 10.x.

## Recommended local validation
Use the repository's declared Node/npm versions, then:

```bash
npm ci
npx prisma generate
npm run prisma:validate
npm run typecheck:api
npm run typecheck:web
npm run build:all
npm run test:unit
bash scripts/start-dev.sh
```

For Windows PowerShell:

```powershell
npm ci
npx prisma generate
npm run prisma:validate
npm run typecheck:api
npm run typecheck:web
npm run build:all
npm run test:unit
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

## Follow-up: Kubernetes startup resilience

The Windows and Unix development launchers were updated after validation on 2026-09-21. Kubernetes is no longer a hard prerequisite in the default `auto` mode. If the Kubernetes API is unreachable, startup falls back to PostgreSQL/Redis on localhost. `DEV_INFRA_MODE=local` explicitly disables Kubernetes checks; `DEV_INFRA_MODE=k8s` preserves strict Kubernetes-backed development.


## 2026-09-21 Multi-tenancy/RBAC update

The review package now models three independent boundaries: deployment environment, tenant organization, and clinic scope. Users can have multiple organization memberships. Additional roles can be assigned at organization or clinic scope through `UserRole.scopeKey`. Protected requests resolve active tenant/clinic/roles from authoritative database state using `X-Tenant-Slug` and `X-Clinic-Id`. The functional wireframe exposes environment, tenant, clinic and acting-role selectors plus membership/RBAC views.
