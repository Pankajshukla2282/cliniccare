# ClinicCare Multi-Tenancy, RBAC & Microservice Scope

## Isolation Model: Three Independent Boundaries

ClinicCare decomposes into **9 microservices** that share a PostgreSQL database but enforce isolation through three distinct boundaries:

```text
Deployment Environment
  development | staging | production
          |
          +-- Infrastructure isolation (K8s namespaces, secrets, DB clusters)
          |
          v
Tenant (Organization) ----> Clinic ---> Clinical Data (patients, appointments, etc.)
          |
          +-- RBAC & Permissions
          |
          +-- Microservice Scopes
```

### 1. Deployment Environment Isolation

- **`APP_ENV`** identifies the deployment environment
- **Infrastructure-Level Isolation**: Each environment uses separate Kubernetes namespaces, separate secrets, and (in production) a dedicated PostgreSQL cluster
- **Not a row column**: Environment isolation is NOT achieved by adding an `environmentId` column to every clinical table
- **Recommended namespaces**:
  - `cliniccare-development`
  - `cliniccare-staging`
  - `cliniccare-production`

⚠️ **Never point staging or production at the development database.**

### 2. Tenant (Organization) Boundary

- **`Organization`** is the tenant boundary
- Tenant-owned records carry `organizationId` directly or are reached through a tenant-owned parent (Patient, Clinic, Order, Doctor.clinic)
- **Authenticated requests use**:
  - `X-Tenant-Slug` — requested tenant context (canonical)
  - `X-Clinic-Id` — optional clinic context
- **`TenantAccessGuard`** verifies:
  - User is active
  - Tenant is active/trial
  - Membership exists (user → tenant)
  - Clinic belongs to that tenant
  - User's role assignments apply to that scope

### 2b. Memberships: Which Tenants a User May Access

- **`OrganizationMembership`** answers which tenants a user may access
- A user may have memberships in many organizations
- The user's `organizationId` remains the **home/default organization** for compatibility
- It is **not** a substitute for membership authorization

⚠️ **Never use `User.organizationId` alone to authorize a multi-tenant operation.**

### 3. RBAC & Permissions

- **`UserRole`** answers what the user may do and can be:
  - **Organization scoped**: `organizationId != null, clinicId = null`
  - **Clinic scoped**: `organizationId != null, clinicId != null`
  - **Platform scoped**: `SUPER_ADMIN`, with global permission rows where appropriate
- **`scopeKey`** is the idempotent natural key used by the seed and RBAC services

### 4. Permissions

- **`RolePermission`** contains:
  - Platform defaults (`organizationId = null`)
  - Optional tenant overrides
- **Effective permissions** are calculated for the active tenant/clinic on every protected request

### 5. JWT is a Credential Only

- A JWT is a credential only
- Tenant lifecycle and role membership are **revalidated against PostgreSQL on each protected request**
- Never accept a client-supplied tenant ID as authorization proof
- Resolve authenticated tenant context from membership + `X-Tenant-Slug`
- Validate `X-Clinic-Id` belongs to the active tenant
- Never use `User.organizationId` alone to authorize a multi-tenant operation
- Public routes resolve tenant by active slug

## Microservice Scope Rules

Each microservice enforces tenant/clinic scope at the API gateway level:

| Microservice | Scope Headers | Enforced By |
|---|---|---|
| **auth** | `X-Tenant-Slug` | Auth gateway |
| **clinical** | `X-Tenant-Slug`, `X-Clinic-Id` | API gateway + service guards |
| **billing** | `X-Tenant-Slug`, `X-Clinic-Id` | API gateway + service guards |
| **product** | `X-Tenant-Slug` | API gateway + service guards |
| **queue** | `X-Tenant-Slug`, `X-Clinic-Id` | API gateway + service guards |
| **lab** | `X-Tenant-Slug`, `X-Clinic-Id` | API gateway + service guards |
| **cms** | `X-Tenant-Slug` | API gateway + service guards |

### Scope Enforcement Example

```http
GET /api/v1/clinical/patients?tenant=cliniccare-demo&clinic=main-clinic

Response: 200 with patients from "cliniccare-demo" organization, "main-clinic" only

# Without clinic scope:
GET /api/v1/clinical/patients?tenant=cliniccare-demo

Response: 200 with all patients from "cliniccare-demo" organization

# Without tenant scope (unauthorized):
GET /api/v1/clinical/patients

Response: 401 Unauthorized - missing X-Tenant-Slug header
```

### Idempotency

- State-changing operations marked with `@RequireIdempotency()` use an idempotency key
- Key is associated with the **authenticated user AND active tenant**
- Retrying the same operation returns the existing result rather than creating a duplicate
- Tenant switching does not change the idempotency namespace of another tenant

## Public Tenant Context

Public tenant routes must use the tenant slug as the canonical context:

```http
GET /api/v1/public/doctors?tenant=cliniccare-demo
GET /api/v1/public/services?tenant=cliniccare-demo
GET /api/v1/public/packages?tenant=cliniccare-demo
GET /api/v1/reviews/published?tenant=cliniccare-demo
GET /api/v1/pages/faq?tenant=cliniccare-demo
GET /api/v1/faqs?tenant=cliniccare-demo
GET /api/v1/appointments/slots?tenant=cliniccare-demo&doctorId=1&date=2026-09-25
```

A legacy `organizationId` query parameter remains accepted temporarily for existing clients, but **new clients should always use `tenant`.**

## Environment-Aware Seed

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

⚠️ **Demo seeding is blocked in production unless explicitly enabled.**

## Security Rules (Microservice-Aware)

1. ✅ **Never accept a client-supplied tenant ID as authorization proof**
2. ✅ **Resolve authenticated tenant context from membership + `X-Tenant-Slug`**
3. ✅ **Validate `X-Clinic-Id` belongs to the active tenant**
4. ✅ **Never use `User.organizationId` alone to authorize a multi-tenant operation**
5. ✅ **Public routes resolve tenant by active slug**
6. ✅ **Keep environment databases and secrets separate**
7. ✅ **Never commit `.env` or generated build directories**

8. ✅ **Each microservice enforces scope at the API gateway level**
9. ✅ **Tenant context is resolved before any service handler executes**
10. ✅ **Audit logs record: actor, tenant, clinic, entity, action, timestamp, result**

## Microservice RBAC Matrix

| Role | auth | clinical | billing | product | queue | lab | cms |
|---|---|---|---|---|---|---|---|
| Super Admin | ✅ global | ✅ all clinics | ✅ all orgs | ✅ all orgs | ✅ all orgs | ✅ all orgs | ✅ all orgs |
| Tenant Admin | ✅ own tenant | ✅ own clinics | ✅ own org | ✅ own org | ✅ own org | ✅ own org | ✅ own org |
| Clinic Admin | ✅ own tenant | ✅ own clinic | ✅ own org | ✅ own org | ✅ own org | ✅ own org | ✅ own org |
| Doctor | ✅ own tenant | ✅ own clinic | ❌ restricted | ✅ own org | ✅ own org | ✅ own org | ❌ restricted |
| Receptionist | ✅ own tenant | ✅ own clinic | ✅ own org | ✅ own org | ✅ own org | ❌ restricted | ❌ restricted |
| Pharmacist | ✅ own tenant | ❌ restricted | ✅ own org | ✅ own inventory | ❌ restricted | ❌ restricted | ❌ restricted |
| Accountant | ✅ own tenant | ❌ restricted | ✅ all invoices | ❌ restricted | ❌ restricted | ❌ restricted | ❌ restricted |
| Content Manager | ✅ own tenant | ❌ restricted | ❌ restricted | ❌ restricted | ❌ restricted | ❌ restricted | ✅ all orgs |
| Patient | ✅ own tenant | ✅ own records | ✅ own orders | ❌ restricted | ❌ restricted | ✅ own records | ❌ restricted |

✅ = full access | ❌ = restricted or denied