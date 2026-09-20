# Git / release strategy

- `main`: production-ready code only.
- `develop`: integration branch when a long-lived integration branch is useful.
- `feature/*`: small focused changes.
- `fix/*`: production/non-production defects.
- `release/*`: stabilization and release notes.

Every pull request should pass: Prisma validation, Prisma generation, API/Web typecheck, unit tests, security audit threshold, and production build.

Deploy immutable artifacts. Run database migrations before application rollout when migrations are backward compatible. For destructive schema changes, use expand/contract migrations and defer removal until all application instances use the new schema.
