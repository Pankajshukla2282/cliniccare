# ClinicCare — Multi-Tenancy, Environments and RBAC

## 1. Architecture at a glance

```text
                         ClinicCare Platform
                                  |
             +--------------------+--------------------+
             |                    |                    |
        Development             Staging             Production
        DB/Redis/Secrets        isolated            isolated
             |                    |                    |
       +-----+-----+        +-----+-----+        +-----+-----+
       | Tenant A  |        | Tenant A  |        | Tenant A  |
       | Tenant B  |        | Tenant B  |        | Tenant B  |
       +-----+-----+        +-----+-----+        +-----+-----+
             |
       OrganizationMembership
             |
       UserRole (org/clinic scoped)
             |
       Effective Permissions
```

## 2. Three separate concepts

| Concept | Boundary | Example |
|---|---|---|
| Environment | Infrastructure/deployment | development, staging, production |
| Tenant | Business/data | ClinicCare Demo Organization |
| Clinic | Operational scope inside a tenant | Main Clinic |
| User role | Authorization | Doctor, Nurse, Accountant |

These must not be conflated. A tenant slug is not an environment name, and a clinic is not a tenant.

## 3. Tenant isolation

`Organization` is the tenant root. API services use the authenticated request's organization context. The client cannot override it simply by putting another `organizationId` in a DTO.

The request context is established by `TenantAccessGuard` (and the Prisma schema keeps the two clinic relationships distinct):

```text
JWT subject
  -> active user
  -> requested X-Tenant-Slug
  -> OrganizationMembership validation
  -> requested X-Clinic-Id validation
  -> scoped UserRole lookup
  -> RolePermission lookup
  -> effective RequestUser
```

For platform administration, `SUPER_ADMIN` may switch to an active/trial tenant for tenant lifecycle operations.

## 4. User membership model

A single user account can belong to more than one tenant:

```text
User
 ├── home organization (legacy/default)
 └── OrganizationMembership[]
       ├── Organization A + default clinic
       └── Organization B + default clinic
```

Membership status is independently managed. An inactive membership does not authorize tenant access.

## 5. Role model

Roles are additive. `User.primaryRole` supplies the backward-compatible home role, while `UserRole` stores explicit scoped assignments.

```text
SUPER_ADMIN                 platform/global
ADMIN                       organization
CLINIC_ADMIN                organization or clinic
DOCTOR                      organization or clinic
RECEPTIONIST                organization or clinic
NURSE                       organization or clinic
PHARMACIST                  organization or clinic
ACCOUNTANT                  organization or clinic
CONTENT_MANAGER             organization
PATIENT                     organization
```

A tenant administrator cannot grant `SUPER_ADMIN`. Platform administration is required for that role.

## 6. Permission model

`RolePermission` has two levels:

- platform default: `organizationId = NULL`
- tenant override: `organizationId = <tenant id>`

Tenant-specific permission rows override the platform default for the same role/permission pair.

The effective set is calculated for the active tenant and role assignments. Permission changes are therefore visible without waiting for a new JWT.

## 7. Environment management

Every environment should have independent:

- PostgreSQL database
- Redis/cache
- object storage
- JWT/signing keys
- encryption keys
- API/web deployment
- Kubernetes namespace
- monitoring/logging destination
- third-party credentials where applicable

Promotion is a deployment operation, not a database-sharing operation:

```text
development -> CI validation -> staging -> approval -> production
```

Production records are never used as the development database.

## 8. API headers

Authenticated requests may select context with:

```http
X-Tenant-Slug: cliniccare-demo
X-Clinic-Id: 42
```

The server validates both values. Missing headers fall back to the user's home tenant/default clinic.

## 9. Idempotency

State-changing operations requiring idempotency use:

```http
Idempotency-Key: appointment-create-<client-generated-unique-value>
```

The database uniqueness boundary includes the organization context. Failed operations release an incomplete reservation; successful operations retain the key until the configured TTL.

## 10. Demo coverage

The approval wireframe now exposes the model directly:

- environment selector: development/staging/production
- tenant selector: multiple demo organizations
- clinic selector: clinic scope within the active tenant
- role selector: acting role
- user membership and role assignment screens
- organization/clinic administration
- tenant lifecycle information
- environment isolation explanation
- RBAC permission matrix
- idempotency/audit view

This makes the wireframe useful for demonstrating the same tenancy/access concepts implemented by the API rather than presenting unrelated static screens.

## 11. Prisma relation naming

`Clinic` and `OrganizationMembership` have one explicit relation for a member's default clinic:

```text
Clinic.defaultMemberships
        <->
OrganizationMembership.defaultClinic
        @relation("ClinicDefaultMemberships")
```

There is intentionally no second `Clinic.memberships` relation. Membership itself belongs to an `Organization`; clinic-specific authorization belongs to `UserRole.clinicId`. This avoids Prisma P1012 ambiguous-relation validation errors and avoids adding a redundant foreign key to `organization_memberships`.
