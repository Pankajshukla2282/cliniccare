# Environment strategy

| Environment | Source of config | Database | Secrets | Swagger | Debug |
|---|---|---|---|---|---|
| development | root/app `.env` files | local/dev PostgreSQL | local only | optional | allowed |
| staging | CI/CD environment + secret manager | isolated staging PostgreSQL | secret manager | optional/authenticated | restricted |
| production | deployment environment + secret manager | managed PostgreSQL/PITR | secret manager/KMS | disabled by default | disabled |

Never commit `.env`, database credentials, JWT secrets, API keys, payment secrets, or PHI.

The same variable names are used across environments; only values change. Module-specific variables live in `apps/api/.env` and `apps/web/.env`, while shared database/secret values can be supplied at the deployment environment level.

### Development infrastructure selection

`DEV_INFRA_MODE` controls whether local development uses Kubernetes-backed services or local PostgreSQL/Redis. It defaults to `auto` so a stopped Docker Desktop Kubernetes cluster does not prevent startup when the required services are already available locally.

## Environment isolation and promotion

ClinicCare separates **deployment environments** from **tenants**:

- `development`, `staging`, and `production` are deployment environments.
- Each environment must use a separate PostgreSQL database, Redis instance, object-storage prefix/bucket, JWT/signing secrets, encryption keys, and Kubernetes namespace (or equivalent runtime boundary).
- A tenant (`Organization`) exists independently inside one environment. The same tenant slug may exist in development/staging/production without sharing data.
- Do not use a single production database for multiple deployment environments.

Recommended configuration:

```text
APP_ENV=development|staging|production
NODE_ENV=development|production
DEPLOYMENT_NAMESPACE=cliniccare-dev|cliniccare-staging|cliniccare-prod
TENANT_BASE_DOMAIN=dev.cliniccare.local|staging.cliniccare.example.com|cliniccare.example.com
DATABASE_URL=<environment-specific database>
REDIS_URL=<environment-specific redis>
JWT_SECRET=<environment-specific secret>
```

The application never uses `APP_ENV` as a tenant identifier. Tenant isolation is enforced by `organizationId`; environment isolation is provided by infrastructure and credentials.

## Multi-tenancy

`Organization` is the tenant boundary. Tenant-owned clinical, operational, catalog, commerce and content records carry an organization relationship directly or through a parent such as `Patient`, `Clinic` or `Doctor`.

The API establishes an **active tenant context** on every authenticated request:

1. The login/home organization is loaded from the authenticated account.
2. `X-Tenant-Slug` may switch the active tenant only when the user has an active `OrganizationMembership`; platform `SUPER_ADMIN` can select any active/trial tenant.
3. `X-Clinic-Id` may narrow the request to a clinic after verifying that the clinic belongs to the active tenant.
4. Services receive `@OrgId()` from the authoritative request context rather than trusting a client-supplied organization ID.
5. The tenant access guard re-reads account, membership, tenant lifecycle, clinic and role state from PostgreSQL on protected requests.

This prevents a user from changing an organization ID in a request body or URL to access another tenant's records.

## Multiple organizations per user

A user is allowed to have memberships in multiple organizations. `OrganizationMembership` stores the relationship and optional default clinic. The existing `User.organizationId` remains the user's home/default organization for backward compatibility.

Use the RBAC membership endpoint to provision another tenant membership:

```text
POST /api/v1/rbac/users/:userId/memberships
```

with an organization and optional default clinic.

## Multiple user roles

ClinicCare supports:

- platform role: `SUPER_ADMIN`
- tenant roles: `ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `NURSE`, `PHARMACIST`, `ACCOUNTANT`, `CONTENT_MANAGER`, `PATIENT`

`User.primaryRole` remains the backward-compatible home-tenant role. Additional role assignments are stored in `UserRole` and can be scoped to:

- an entire organization, or
- one clinic within the organization.

`scopeKey` makes every role assignment idempotent and uniquely addressable. A role assignment cannot point at a clinic belonging to another organization.

Permissions are resolved as:

```text
active tenant + active clinic + applicable roles
        ↓
platform default permissions
        +
tenant-specific permission overrides
        ↓
effective permissions
```

Changing a role or permission takes effect on the next protected request because the guard refreshes authoritative RBAC state from the database rather than trusting stale JWT permission claims.

## Tenant switching

The web/API client should send:

```http
Authorization: Bearer <access-token>
X-Tenant-Slug: cliniccare-demo
X-Clinic-Id: 123
```

When no tenant header is supplied, the user's home tenant is used. The server remains authoritative; these headers select context but never grant access by themselves.

## Idempotency and tenant isolation

State-changing endpoints decorated with `@RequireIdempotency()` require an `Idempotency-Key`. The key is stored with the active organization context. Therefore the same business operation key cannot accidentally be replayed as a new operation inside the same tenant.

Environment isolation remains infrastructure-level: development and production should never share the same idempotency table/database.
