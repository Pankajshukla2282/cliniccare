# ClinicCare Environment Configuration

## Principles

1. Environment-specific values belong in environment configuration.
2. Secrets must never be committed.
3. Browser-exposed configuration must use `NEXT_PUBLIC_*` only.
4. Production secrets should be injected by AWS Secrets Manager/SSM or the deployment platform.
5. `.env.example` files contain placeholders and documentation only.

## Files

- `.env.example` — root/local development template.
- `apps/api/.env.example` — API-specific template.
- `apps/web/.env.example` — Next.js-specific template.
- `prisma/.env.example` — Prisma CLI/database template.
- `scripts/.env.example` — development/automation scripts template.
- `.env.development.example` — development overlay.
- `.env.staging.example` — staging overlay.
- `.env.production.example` — production overlay.

Real files should be named `.env`, `.env.development`, etc. as appropriate and must be gitignored.

## Local setup

```powershell
Copy-Item .env.example .env
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env
Copy-Item prisma\.env.example prisma\.env
Copy-Item scripts\.env.example scripts\.env
```

Replace placeholder secrets and database credentials.

## Production

Do not deploy committed `.env` files containing secrets. Inject:

- DATABASE_URL
- JWT_SECRET
- SMTP_PASSWORD
- PAYMENT_API_KEY
- AWS credentials where required

from the deployment secret manager.

`NEXT_PUBLIC_*` values are not secrets and are bundled into browser code.

## Tenant context

Environment and tenant are deliberately separate. `APP_ENV` selects the deployment boundary; `X-Tenant-Slug` selects the active organization inside an authenticated environment. `X-Clinic-Id` optionally narrows the active tenant to a clinic. Public routes use the `tenant` slug query parameter.

See `docs/MULTI-TENANCY-RBAC-ENVIRONMENTS.md` and `docs/ENVIRONMENTS.md`.
