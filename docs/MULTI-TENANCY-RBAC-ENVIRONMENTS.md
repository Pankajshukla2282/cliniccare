# ClinicCare Multi-Tenancy, Environments and RBAC

## Isolation model

ClinicCare has three independent boundaries:

```text
Deployment environment
  development | staging | production
          |
          +-- isolated infrastructure / secrets / database
          |
          v
Tenant (Organization)
          |
          +-- Clinic(s)
          +-- Patients
          +-- Services / Products / Orders / Clinical records / CMS
          |
          +-- OrganizationMembership
          |      user <-> tenant
          |
          +-- UserRole
                 organization scope OR clinic scope
```

### Environment

`APP_ENV` identifies the deployment environment. Environment isolation is infrastructure-level, not a row column on every clinical table. Each environment should use its own PostgreSQL database, object-storage prefix/bucket, secrets, Redis/job infrastructure, hostnames and Kubernetes namespace.

Recommended namespaces:

- `cliniccare-dev`
- `cliniccare-staging`
- `cliniccare-prod`

Never point staging or production at the development database.

### Tenant

`Organization` is the tenant boundary. Tenant-owned records carry `organizationId` directly or are reached through a tenant-owned parent such as `Patient`, `Clinic`, `Order` or `Doctor.clinic`.

Authenticated requests use:

- `X-Tenant-Slug` — requested tenant context
- `X-Clinic-Id` — optional clinic context

`TenantAccessGuard` verifies the user is active, the tenant is active/trial, the membership exists, the clinic belongs to that tenant, and the user's role assignments apply to that scope.

### Memberships

`OrganizationMembership` answers **which tenants a user may access**. A user may have memberships in many organizations.

The user's `organizationId` remains the home/default organization for compatibility. It is not a substitute for membership authorization.

### Roles

`UserRole` answers **what the user may do** and can be:

- organization scoped: `organizationId != null, clinicId = null`
- clinic scoped: `organizationId != null, clinicId != null`
- platform scoped: `SUPER_ADMIN`, with global permission rows where appropriate

`scopeKey` is the idempotent natural key used by the seed and RBAC services.

### Permissions

`RolePermission` contains platform defaults (`organizationId = null`) and optional tenant overrides. Effective permissions are calculated for the active tenant/clinic on every protected request.

A JWT is a credential only. Tenant lifecycle and role membership are revalidated against PostgreSQL on each protected request.

## Public tenant context

Public tenant routes must use the tenant slug as the canonical context:

```text
GET /api/v1/public/doctors?tenant=cliniccare-demo
GET /api/v1/public/services?tenant=cliniccare-demo
GET /api/v1/public/packages?tenant=cliniccare-demo
GET /api/v1/reviews/published?tenant=cliniccare-demo
GET /api/v1/pages/faq?tenant=cliniccare-demo
GET /api/v1/faqs?tenant=cliniccare-demo
GET /api/v1/appointments/slots?tenant=cliniccare-demo&doctorId=1&date=2026-09-25
```

A legacy `organizationId` query parameter remains accepted temporarily for existing clients, but new clients should always use `tenant`.

## Environment-aware seed

The seed is idempotent and never depends on hard-coded clinic IDs. Use:

```powershell
$env:APP_ENV='development'
$env:SEED_TENANT_SLUG='cliniccare-demo'
npm run db:seed
```

For staging/demo data:

```powershell
$env:APP_ENV='staging'
$env:SEED_TENANT_SLUG='cliniccare-staging-demo'
$env:SEED_ALLOW_DEMO='true'
npm run db:seed
```

Demo seeding is blocked in production unless explicitly enabled.

## Idempotency

State-changing operations marked with `@RequireIdempotency()` use an idempotency key associated with the authenticated user and active tenant. Retrying the same operation returns the existing result rather than creating a duplicate operation.

Tenant switching does not change the idempotency namespace of another tenant.

## Security rules

1. Never accept a client-supplied tenant ID as authorization proof.
2. Resolve authenticated tenant context from membership + `X-Tenant-Slug`.
3. Validate `X-Clinic-Id` belongs to the active tenant.
4. Never use `User.organizationId` alone to authorize a multi-tenant operation.
5. Public routes resolve tenant by active slug.
6. Keep environment databases and secrets separate.
7. Never commit `.env` or generated build directories.
