# Multi-Tenancy / Environment / RBAC Update — 2026-09-21

## Implemented

- Added `OrganizationMembership` so one user account can belong to multiple tenants.
- Added tenant and clinic scope to `UserRole`.
- Added unique `scopeKey` for idempotent role assignments.
- Added tenant/clinic-aware authorization using `X-Tenant-Slug` and `X-Clinic-Id`.
- Revalidated tenant, clinic, account and RBAC state from PostgreSQL on protected requests.
- Kept `User.organizationId` and `User.primaryRole` as backward-compatible home-tenant defaults.
- Added organization/clinic membership and role-assignment APIs.
- Added tenant-specific permission management for platform administrators.
- Preserved platform-default and tenant-override permission behavior.
- Added independent environment configuration (`APP_ENV`, deployment namespace and environment-specific tenant domain).
- Added a production rule that deployment environments use isolated database/Redis/secrets/storage/runtime boundaries.
- Added a second demo tenant to the seed for cross-tenant testing.
- Updated the functional wireframe with environment, tenant, clinic and role context selectors.
- Updated the wireframe Users & RBAC and Tenant & Environment screens.
- Updated the RBAC architecture diagram and technical documentation.
- Removed the duplicate public tenant controller.

## Important migration

Run the new Prisma migration before starting the API against an existing database:

```bash
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

For a disposable local database, `npx prisma db push` may be used during development, but migration deployment is the preferred path for shared/staging/production environments.

## Validation performed in this package

- Wireframe JavaScript syntax check: passed.
- `scripts/start-dev.sh` shell syntax check: passed.
- Duplicate public tenant endpoint check: passed; one controller remains.
- Stale `userId_role` application references: removed.
- Prisma validation could not be executed in the review container because dependencies were intentionally not installed and the attempted `npx prisma@7.10.0 validate` did not complete within the execution window.


## Prisma relation validation fix

The multi-tenant schema initially declared both `Clinic.memberships` and `Clinic.defaultMemberships` against `OrganizationMembership`, while only `defaultClinicId` provided a clinic foreign key. Prisma 7 correctly reported this as an ambiguous relation (P1012).

The schema is now explicit:

- `Clinic.defaultMemberships` uses `@relation("ClinicDefaultMemberships")`.
- `OrganizationMembership.defaultClinic` uses the same named relation.
- The redundant `Clinic.memberships` field was removed.
- No database migration is required for this correction because the underlying `defaultClinicId` column and foreign key are unchanged.
- Clinic-scoped roles continue to use `UserRole.clinicId`.

After pulling this version, run `npm run prisma:validate` before `npm run db:generate`.
