# ClinicCare Environment Runbook

## Supported environments

| Environment | APP_ENV | Namespace | Database | Web | API |
|---|---|---|---|---|---|
| Development | `development` | `cliniccare-dev` | dedicated dev DB | local/Dev host | local/Dev host |
| Staging | `staging` | `cliniccare-staging` | dedicated staging DB | staging host | staging API |
| Production | `production` | `cliniccare-prod` | dedicated production DB | production host | production API |

Environment names are configuration boundaries. They are not tenant IDs.

## Local development

Use a repository `.env` copied from `.env.example`.

```text
APP_ENV=development
DEV_INFRA_MODE=local
DATABASE_URL=postgresql://...@localhost:5432/cliniccare
DEFAULT_TENANT_SLUG=cliniccare-demo
```

`DEV_INFRA_MODE=auto` uses Kubernetes only when the cluster is reachable; otherwise it uses local PostgreSQL. `DEV_INFRA_MODE=k8s` makes Kubernetes mandatory.

Redis is **not required by the current API runtime** and is no longer port-forwarded by the development launcher. It can remain in the Kubernetes infrastructure for future jobs/cache work.

## Windows

```powershell
$env:DEV_INFRA_MODE='local'
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

## Unix / WSL

```bash
DEV_INFRA_MODE=local bash scripts/start-dev.sh
```

## Build order

```text
npm ci
  -> prisma validate
  -> prisma generate
  -> API typecheck/build
  -> Web typecheck/build
```

Do not commit `dist/`, `.next/`, `node_modules/`, runtime logs or local `.env` files.
