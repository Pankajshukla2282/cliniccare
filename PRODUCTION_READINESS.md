# ClinicCare production hardening

This branch contains a first production-hardening pass. It intentionally avoids
changing clinical workflows while tightening the platform boundary.

## Applied

- Node 24 alignment for the root/API build.
- Strict API TypeScript null checking.
- Global request validation now rejects unknown fields.
- Helmet security headers enabled on the API.
- Explicit production CORS allow-list; wildcard CORS is rejected in production.
- JWT startup fail-fast: production requires a 32+ character `JWT_SECRET`.
- More robust bearer-token parsing.
- Separate liveness (`/healthz`) and database readiness (`/readyz`) endpoints.
- Kubernetes readiness probe now checks `/readyz`.
- Session and password-reset tokens have explicit types.
- Refresh-token rotation uses a conditional update to reduce concurrent-token replay.
- Password reset tokens are one-time and invalidate active sessions.
- Web security response headers added.
- CI uses Node 24, typechecks both applications, and runs a high-severity dependency audit.
- Added `.env.example`.
- Added production migration for token typing.

## Before go-live

1. Configure secrets outside Git (`JWT_SECRET`, database credentials, provider keys).
2. Use `prisma migrate deploy`; never use `prisma db push` against production.
3. Replace example CORS/API domains with the real production origins.
4. Configure TLS at the ingress/load balancer.
5. Configure centralized logs and alerting.
6. Test PostgreSQL backup restoration, not only backup creation.
7. Add automated unit/integration/E2E tests for authentication, tenant isolation,
   appointment booking, clinical records, billing, and permissions.
8. Review data-retention, consent, access logging, and breach-response procedures
   for the jurisdictions where ClinicCare operates.
9. Run dependency and container vulnerability scans as part of release CI.
10. Verify Kubernetes resource limits, PodDisruptionBudgets, network policies,
    secret rotation, and database HA/backups for the target production topology.


## Stage 2 — security, tenant isolation, RBAC and centralized logging

- Added `TenantAccessGuard` after JWT authentication. Every protected request now re-validates the user and organization against PostgreSQL.
- Suspended/inactive users are rejected immediately instead of waiting for JWT expiry.
- Suspended/cancelled tenants are rejected for non-super-admin users.
- JWT organization, role and clinic claims are no longer treated as authoritative; the current database values are injected into the request context.
- RBAC permissions are refreshed from `role_permissions` on every protected request so permission changes take effect without waiting for token renewal.
- Role assignment is enforced server-side with an explicit role-management matrix. Tenant users cannot create or assign `SUPER_ADMIN` privileges.
- User creation/update responses never return `passwordHash`.
- User-management password hashing uses the production bcrypt floor.
- Added HTTP request logging and centralized API logging under the repository-root `logs/` directory.
- Added Next.js server console interception so web runtime logs are also written to `logs/web-YYYY-MM-DD.log` while preserving container stdout.
- Log output redacts bearer tokens, passwords, secrets, authorization values and cookies.
- Kubernetes API/Web pods mount `/srv/logs` from a dedicated writable volume while the application filesystem is read-only.
- Redis upgraded to the Redis 8.2 extended-support line and protected with a password.
- PostgreSQL upgraded to PostgreSQL 18.6.
- Kubernetes pods use RuntimeDefault seccomp, drop Linux capabilities and disable privilege escalation.
- API readiness now checks `/readyz`; liveness remains `/healthz`.
- Production containers use `node:24.21.0-bookworm-slim`.
- Production dependency manifests target the requested Node/npm/Next/React/Nest/TypeScript/Prisma/ESLint baseline.

## Important deployment note

The archive's dependency manifests have been updated to the requested baseline, but the preparation environment could not reach the npm registry, so `package-lock.json` was not regenerated. Run `npm install` once with Node 24.21.0/npm 11.x, verify the resulting dependency tree, commit the generated lockfile, and use `npm ci` thereafter.
