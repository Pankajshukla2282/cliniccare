# ClinicCare Platform

Multi-tenant (SaaS) digital clinic platform: consultations, EECP/EECP+
therapy, dermatology & skin care, and doctor-recommended product commerce —
plus on-boarding, org-scoped RBAC/isolation, and per-subdomain tenant branding.

Designed for two primary doctors (EECP + metallic detox, and skin care /
cosmetics) with an architecture that scales to more doctors, branches, and
board-in clinics without re-architecture.

## Stack

| Layer           | Technology                                      |
|-----------------|-------------------------------------------------|
| Web             | Next.js 16 (App Router) + TypeScript + Tailwind, shadcn/ui design system, subdomain proxy, dark mode |
| API             | NestJS + TypeScript, Prisma ORM, JWT auth, org-scoped RBAC |
| Database        | PostgreSQL (Prisma; `organizationId` scoped)    |
| Optional infrastructure | Redis (reserved for future cache/jobs)              |
| Files           | S3-compatible object storage                    |
| Deploy          | Kubernetes only — no Docker Compose             |

## About the product

**ClinicCare** is a white-label, multi-tenant platform that runs an entire
clinic on software. Each subscribing clinic (a **tenant**) gets its own
subdomain, its own on-brand skin, and its own org-scoped data island — while
the platform stays a single shared deployment owned by ClinicCare.

Everything a patient touches (booking, consultations, products, invoices) and
everything a doctor touches (daily OP, EECP/EECP+ therapy courses, skin-care
plans, prescriptions, follow-ups) routes through the same tenant-scoped API.

### Domain modules and how they relate

```
TenantsModule · AuthModule · UsersModule · AuditModule          (platform layer)
        │                 │                 │
        ▼                 ▼                 ▼
ClinicsModule ──▶ DoctorsModule ──▶ PatientsModule              (directory)
        │                 │                 │
        ▼                 ▼                 ▼
AppointmentsModule ────────┤           ├──  CatalogModule (services/specialties/packages)
        │                 │           │
        ▼                 ▼           ▼
ClinicalModule · TreatmentsModule · SkinModule ──▶ DocumentsModule (records/files)
Consultations/prescriptions  EECP courses    skin plans
        │                              │
        ▼                              ▼
ProductsModule ─▶ OrdersModule ─▶ BillingModule                  (commerce)
        ▲            │              │
        └──── Coupons/CMS ──────────┘
EngagementModule(reviews/testimonials) · SearchModule · ReportsModule · NotificationsModule
```

Read it as four rings:

1. **Platform** — `Tenants` (on-board/console), `Auth` (login, tenant-signup,
   reset), `Users`/`Audit` (org-scoped RBAC + audit trail). Everything
   downstream depends on the org context resolved here.
2. **Directory** — `Clinics` → `Doctors` → `Patients`. The people graph every
   domain module hangs off.
3. **Clinical care** — `Appointments` (scheduling/slots/status), `Clinical`
   (consultation, prescription, medical records), `Treatments` (EECP/EECP+
   courses), `Skin` (skin-care plans), `Documents` (reports/scans). All
   read/write patients+doctors and emit audit events.
4. **Commerce & ops** — `Products` → `Orders` (coupons enforce
   `[organizationId, code]`) → `Billing` (invoices/payments/EECP package
   tracking); plus `Engagement` (homepage reviews/testimonials), `Search`,
   `Reports`, `Notifications`, and `Cms` (FAQ/pages/redirects) sitting across
   the others.

Cross-cutting rules: tenant-owned operations are scoped to the active `organizationId`, permissions
are resolved per request from the caller's active membership/clinic context, and composite unique keys
(e.g. coupon `[organizationId, code]`, cms page `[organizationId, slug]`)
enforce tenant isolation at the database. That is the whole
"multi-tenant foundation" guarantee.

### In scope

- Tenant on-boarding (self-service sign-up → provisioning) + super-admin
  console to onboard/update/activate/suspend tenants.
- Org-scoped RBAC across all 21 domain modules; SUPER_ADMIN platform access.
- Patient/doctor/clinic directory, appointments, consultations + prescriptions,
  EECP/EECP+ therapy course + session tracking, skin-care plans, documents.
- Product catalog + coupons, orders, billing/invoices/payments.
- CMS (FAQ, pages), reviews/testimonials, notifications, search, reports,
  audit log.
- Per-subdomain tenant theming (brand, metadata, hero) + dark mode on the web.
- Kubernetes-only deploy: namespace, postgres+PVC, redis, API+web + HPA + ingress.

### Out of scope (now / deliberately deferred)

- Patient portal UI, clinic-staff dashboard, and the platform admin console
  (API + RBAC exist; screens are the next workstream).
- Checkout/payments/notifications/reports **UI** (endpoints exist; no user
  screens yet).
- Multi-branch / board-in-clinic expansion beyond the demo topology, and the
  2-doctor growth path — schema supports it, no UI.
- Real-world go-live concerns: real secrets, production images, TLS + public
  ingress, real payment providers, analytics. Manifests/CVars ship
  `CHANGE_ME`-ready; nothing hard-coded to production.
- Legacy data migration tooling and SMS/WhatsApp delivery channels.

### Explicit non-goals

- Not a patient-facing booking site for arbitrary end-customers — it's the
  clinic's own branded portal.
- No Docker Compose; Kubernetes-only by design.
- No Marketplace/app-store for third-party modules.

## Repository

```
cliniccare/
├── docs/
│   ├── MULTI-TENANCY-RBAC-ENVIRONMENTS.md
│   ├── ENVIRONMENTS.md
│   └── BUILD-AND-START.md
├── prisma/
│   ├── schema.prisma      # 55+ models incl. SaaS fields, composite tenant-keys
│   ├── seed.ts            # platform org + SUPER_ADMIN, demo tenant (brand settings), RBAC matrix — idempotent
│   └── .env.example
├── apps/
│   ├── api/               # NestJS — auth/RBAC/tenants + 21 domain modules (port 3100, swagger /docs)
│   └── web/              # Next.js — homepage + theme system (port 3000)
├── infrastructure/k8s/    # namespace, postgres+PVC, redis, api/web, HPA, ingress
```

Root scripts: `db:push`, `db:generate`, `db:studio`, `prisma:validate`,
`build:api`, `build:web`.

## Quickstart
## Reference docs & diagrams

Planning set (BRD -> TDD -> SOW -> RFP, signed-off order):


```powershell
cd cliniccare
npm install --no-audit --no-fund

# Prisma client + schema (needs a live PostgreSQL; any DATABASE_URL works for generate)
# copy prisma/.env.example to prisma/.env and adjust the password
$env:DATABASE_URL="postgresql://clinic:clinic-change-me@localhost:5432/cliniccare"
npx prisma generate
npx prisma db push

# Seed: platform org + SUPER_ADMIN + demo tenant + permissions
npx tsx prisma/seed.ts
```

## Run dev servers

```powershell
$env:DATABASE_URL="postgresql://clinic:clinic-change-me@localhost:5432/cliniccare"

# One-command local development (Windows)
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1

# Or WSL/Git Bash/Linux/macOS
bash scripts/start-dev.sh

# Individual processes
# API (NestJS) on :3100 — swagger at http://localhost:3100/docs
npm run dev:api

# Web (Next.js) on :3000
npm run dev:web
```

Sandbox sign-in (demo only — change before shared use):

| Role          | Email                        | Password      | Scope |
|---------------|------------------------------|---------------|-------|
| Super admin   | `superadmin@cliniccare.local`| `SuperAdmin123!` | platform / all tenants |
| Tenant admin  | `admin@cliniccare.local`     | `ChangeMe123!`    | ClinicCare Demo org |

## Multi-tenant foundation (done)

- **On-boarding**: public `POST /api/v1/auth/tenant-signup` provisions an
  `Organization` (slug, `TRIAL` status, plan limits, `onboardingCompleted`
  flag) + `CLINIC_ADMIN` + first clinic in one transaction.
- **Super-admin console**: `TenantsModule` + `SuperAdminGuard` expose
  onboard / update / activate / suspend under `SuperAdminGuard`-enforced
  endpoints (`POST /api/v1/tenants`, etc.).
- **RBAC**: `organizationId`-scoped permissions resolved per request
  (`lib/rbac/` in API); platform defaults merge with tenant overrides;
  `SUPER_ADMIN` is global; combined implicit `admin`/`*` for tenant admins.
- **Isolation**: every module is org-scoped — clients can’t read or write
  another tenant’s records (cross-tenant access returns 404). Composite
  unique keys (e.g. `[organizationId, slug]`) mirror this in the DB.
- **Per-tenant UI/theme**: `apps/web/proxy.ts` reads the client subdomain
  (`<slug>.cliniccare.local` or `<slug>.localhost`), then
  `app/layout.tsx` looks up the `Organization` on the server, injects
  `Organization.settings` (brand colors, radius) as CSS variables, and sets
  the tenant name + metadata (`generateMetadata`). Dark mode via
  `next-themes`. Try it:

  ```
  # hosts file
  127.0.0.1 cliniccare-demo.localhost
  ```
  then open `http://cliniccare-demo.localhost:3000/` for the tenant-branded
  skin, or `http://localhost:3000/` for the platform default. During local
  dev a `?tenant=<slug>` query param is also accepted.

## API surface (highlights)

- `POST /api/v1/auth/login|register|tenant-signup`
- `GET  /api/v1/rbac/...` — org-scoped roles/permissions
- `POST /api/v1/tenants` (super-admin) — onboard/update/activate/suspend
- Health checks: `GET /healthz` on both web (`:3000`) and API (`:3100`)
- Public portal routes resolve the active tenant by `tenant` slug. A legacy `organizationId` query parameter remains temporarily supported for existing clients.

## Kubernetes

`infrastructure/k8s/` holds the canonical manifests (namespace, postgres+PVC,
redis, api/web deployments+HPA, ingress for `*.cliniccare.local`). No Docker
Compose. See `infrastructure/k8s/README.md` for the apply order and image
build (`cliniccare/api:<tag>` / `cliniccare/web:<tag>`).

## Status

- [x] Monorepo skeleton + prisma schema (40 models, validated)
- [x] Auth: login / register / refresh / tenant-signup + password reset
- [x] RBAC (org-scoped) + super-admin tenancy console
- [x] Tenant-scoped isolation across appointments, billing, orders, clinical,
      treatments, documents, skin care, clinics, doctors, patients, users, CMS
- [x] Multi-environment configuration with independent environment/database boundaries
- [x] Multi-tenant memberships and organization/clinic-scoped RBAC
- [x] Public tenant routes resolved by tenant slug
- [x] Web: Tailwind + shadcn/ui, dark mode, per-subdomain tenant theming + metadata
- [ ] Patient portal, clinic-staff dashboard, platform console
- [ ] Checkout/payments/notifications UI, reports, search polish
- [ ] Go-live: real secrets, images, production ingress/TLS, HPA traffic

## Notes

- Never commit real secrets. `.env.example` files ship placeholders; copy to
  `.env` and adjust. Manifests use `CHANGE_ME` values by design.

## Multi-tenancy, environments and roles

ClinicCare has explicit isolation boundaries:

- **Environment:** development, staging, production; each has independent infrastructure and secrets.
- **Tenant:** `Organization`; tenant-owned records are organization-scoped.
- **Clinic:** operational scope within a tenant.
- **Membership:** a user can belong to multiple organizations through `OrganizationMembership`.
- **Role:** `UserRole` can be organization- or clinic-scoped.
- **Permission:** platform defaults plus tenant-specific `RolePermission` overrides.

Protected API requests may select context with `X-Tenant-Slug` and `X-Clinic-Id`. The server validates membership, tenant lifecycle, clinic ownership and role assignments before calculating effective permissions.

See [`docs/MULTI-TENANCY-RBAC-ENVIRONMENTS.md`](docs/MULTI-TENANCY-RBAC-ENVIRONMENTS.md) and [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md) for the complete model.


## Kubernetes environment namespaces

Development, staging and production use isolated namespaces: `cliniccare-development`, `cliniccare-staging`, and `cliniccare-production`. The launcher derives the namespace from `APP_ENV` unless `K8S_NAMESPACE` is explicitly set.
