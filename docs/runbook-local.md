# ClinicCare — Local Runbook (build + deploy)

Everything verified against the current tree
(`E:\Pankaj\ClinicCare\cliniccare`, Node 24.x, Windows + PowerShell 5.1,
docker-desktop Kubernetes). Two tracks:

- **A — Run everything locally** (PostgreSQL/Redis in-cluster via port-forward,
  API + web as dev/standalone processes). This is the fast inner loop.
- **B — Build images and deploy to the cluster** (docker build → kustomize base
  → ingress). Also covers migrations, seeding, and smoke tests.

Track C — cloud build + deploy — lives in
[`docs/runbook-cloud.md`](runbook-cloud.md) and runs through the GitHub Actions
pipeline.

## Prereqs

- Node.js >= 18 (repo uses 24.x), npm workspaces monorepo
- Kubernetes running (docker-desktop) + `kubectl` against it
- Root `.env` populated (copy `.env.example` → `.env`). This is the single
  source of credentials — Kustomize and Prisma/seed both read it.

For CLI Prisma/dev-server work `prisma.config.ts` and `seed.ts` load `.env`
themselves; only set an override in the terminal if you target a different DB:

```powershell
$env:DATABASE_URL = "postgresql://clinic:<PASSWORD-FROM-.env>@localhost:5432/cliniccare"
```

---

## Track A — Local development

### A0. One-command startup

On Linux, macOS, WSL, or Git Bash you can run the same startup flow used by CI-style local development:

```bash
bash scripts/start-dev.sh
```

On Windows PowerShell use:

```powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\start-dev.ps1
```

Both launchers use the same `.env` ports, wait for API/Web health endpoints, write logs under `logs/`, and clean up child processes on exit. The web launcher intentionally passes only supported Next.js dev flags.

### A1. Bring up PostgreSQL + Redis (in-cluster, once)

Apply the base; Secrets are generated from root `.env` by Kustomize, so use
the load-restrictor pipeline (plain `kubectl apply -k` refuses to read `../.env`):

```powershell
cd E:\Pankaj\ClinicCare\cliniccare
kubectl kustomize infrastructure/k8s/base --load-restrictor LoadRestrictionsNone | kubectl apply -f -
kubectl get pods -n cliniccare            # wait until postgres+redis Running (1/1)
```

Forward the DB + cache to localhost so API/web can connect:

```powershell
# run each in its own terminal
kubectl port-forward svc/postgres -n cliniccare 5432:5432
kubectl port-forward svc/redis    -n cliniccare 6379:6379
```

Verify 5432 listens before proceeding (`Get-NetTCPConnection -LocalPort 5432 -State Listen`).

### A2. Install + generate Prisma client

```powershell
npm install --no-audit --no-fund
npx prisma generate
npx prisma validate
```

### A3. Apply migrations (not `db push`)

A baseline migration `20260915000000_init` exists; never `db push` once
migrations are in play, or the migrations table and schema can drift:

```powershell
npx prisma migrate deploy   # applies pending migrations to the port-forwarded DB
npx prisma migrate status   # expect: "Database schema is up to date!"
```

### A4. Seed (idempotent — safe to re-run)

```powershell
npx tsx prisma/seed.ts   # platform org + super admin, demo tenant, RBAC matrix
```

Credentials come from root `.env` (`SEED_SUPER_ADMIN_PASSWORD`,
`SEED_ADMIN_PASSWORD`) and are re-hashed on every run, so re-seeding also
rotates the demo passwords to match `.env`.

| Role          | Email                         | Password |
|---------------|-------------------------------|----------|
| Super admin   | `superadmin@cliniccare.local` | `$env:SEED_SUPER_ADMIN_PASSWORD` |
| Tenant admin  | `admin@cliniccare.local`      | `$env:SEED_ADMIN_PASSWORD` |

### A5. Run the API

```powershell
npm run dev --workspace=@cliniccare/api
# -> http://localhost:3100   swagger at http://localhost:3100/docs (dev only)
```

Health: `GET http://localhost:3000/healthz` → `{"status":"ok","service":"cliniccare-api",…}`.

### A6. Run the web app

```powershell
npm run dev --workspace=@cliniccare/web
# -> http://localhost:3000
```

Health: `GET http://localhost:3100/healthz`.

> Both servers need the DB reachable on 5432 (port-forward). The web is
> dynamic (subdomain theming) and reads tenant settings through Prisma at
> request time.
> `NEXT_PUBLIC_*` values are inlined at build time; for dev the default in
> `apps/web/lib/config.ts` supplies the development API default (`http://localhost:3100`). The web listens on `WEB_PORT` (default `3000`).

### A7. Verify multi-tenant theming locally

```
# add to %SystemRoot%\System32\drivers\etc\hosts
127.0.0.1 cliniccare-demo.localhost
```

- `http://cliniccare-demo.localhost:3000/` → teal tenant theme, tenant meta/title, org-scoped banner
- `http://localhost:3000/` → default blue platform theme
- Dev-only query fallback: `http://localhost:3000/?tenant=cliniccare-demo`

Quick CLI check (no hosts edit needed):

```powershell
curl.exe -s -H "Host: cliniccare-demo.localhost" "http://127.0.0.1:3000/" | Select-String -Pattern "cliniccare-demo"
```

Expect an `x-tenant-subdomain: cliniccare-demo` response header and tenant-branded HTML.

---

## Track B — Build images and deploy to the cluster

The full in-cluster stack: postgres, redis, api, web, ingress, plus quota,
network policy, HPA, PDB, and the backup CronJob.

### B1. Build the app images

Images build against the npm workspaces root (hoisted deps), so build from the
repo root with the app's Dockerfile:

```powershell
cd E:\Pankaj\ClinicCare\cliniccare
docker build -t cliniccare/api:dev -f apps/api/Dockerfile .
docker build -t cliniccare/web:dev -f apps/web/Dockerfile .
```

Notes:
- The **api** image contains the Prisma CLI + `prisma/migrations`, so the
  cluster can run `prisma migrate deploy` (see B3).
- The **web** image is Next.js `output: standalone`; `NEXT_PUBLIC_API_URL` is
  baked in at build time (pass via `--build-arg` for non-default targets).
- Tagging `:dev` + `imagePullPolicy: IfNotPresent` lets you iterate locally
  without pushing to a registry.

Sanity-check a build locally before deploying:

```powershell
docker run --rm -d --name api-smoke -p 12300:3000 cliniccare/api:dev
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:12300/healthz   # 200
docker rm -f api-smoke

docker run --rm -d --name web-smoke -p 12301:3000 cliniccare/web:dev
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:12301/healthz   # 200
docker rm -f web-smoke
```

### B2. Apply the base to the cluster

```powershell
kubectl kustomize infrastructure/k8s/base --load-restrictor LoadRestrictionsNone | kubectl apply -f -
```

### B3. Migrations run automatically

Every new api pod runs `npx prisma migrate deploy` in its `migrate`
initContainer before the API starts (idempotent — `migrations` table tracks
what already applied). Seed separately if you want demo data:

```powershell
kubectl -n cliniccare rollout status deploy/api --timeout=300s
kubectl -n cliniccare rollout status deploy/web --timeout=300s
kubectl get pods -n cliniccare        # all Running 1/1 (or 2/2 with HPA scaling)
kubectl get ingress -n cliniccare
# optional seed against the in-cluster DB:
kubectl -n cliniccare exec deploy/api -- npx prisma db seed  # or psql-based via port-forward
```

### B4. Ingress hostnames (update /etc/hosts)

```
127.0.0.1 api.cliniccare.local web.cliniccare.local cliniccare-demo.cliniccare.local
```

- `http://api.cliniccare.local/` → API (`/healthz` returns 200)
- `http://web.cliniccare.local/` → web (platform theme)
- `http://cliniccare-demo.cliniccare.local/` → tenant-branded web

### B5. Roll, scale, backup

```powershell
# rolling update after a rebuild (images are IfNotPresent / tagged :dev — same pipeline):
kubectl kustomize infrastructure/k8s/base --load-restrictor LoadRestrictionsNone | kubectl apply -f -
kubectl -n cliniccare rollout status deploy/api

# HPA (base) targets cpu 70% — api 1–5, web 1–3 replicas automatically
kubectl -n cliniccare get hpa

# daily 02:00 backup CronJob (keeps last 7 dumps on backup-pvc)
kubectl -n cliniccare get cronjob
```

---

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| API `ECONNREFUSED 5432` | port-forward not running — `kubectl port-forward svc/postgres … 5432:5432` |
| api pod stuck `Init` | migrate initContainer failed — `kubectl -n cliniccare logs deploy/api -c migrate` |
| `P1012: Schema validation` | stale client/knowledge — `npx prisma generate` + `npx prisma validate` |
| `ImagePullBackOff` on api/web | images not built — Track B1; check `kubectl describe pod -n cliniccare` |
| Web 500 on tenant subdomain | org row/slug missing — run `npx tsx prisma/seed.ts` |
| `… organizationId ____ not found` 404 | cross-tenant access is intentionally blocked (org-scoped isolation) |
| Can't `apply -k` | Kustomize refuses to read `../.env` outside the dir — use the `kustomize`+pipe form |
| Port 3000/3100 busy | change dev port or stop the existing process |

---

## Related files

- `infrastructure/k8s/` — `base/` (all manifests + kustomization) and
  `overlays/prod/` (cloud tuning); see `infrastructure/k8s/README.md`
- `docs/runbook-cloud.md` — cloud build + deploy via GitHub Actions
- `prisma/seed.ts` + `prisma/schema.prisma` — seed + validated schema,
  migrations in `prisma/migrations/`
- `apps/api` — NestJS (auth/RBAC/tenants + domain modules, port 3100),
  hardened: helmet, throttler, graceful shutdown
- `apps/web` — Next.js (Tailwind + shadcn/ui, subdomain tenant theming,
  standalone output, port 3000 in container / 3000 in dev)
## Local infrastructure mode (Windows / Unix)

Development startup now supports `DEV_INFRA_MODE`:

- `auto` (default): use Kubernetes when reachable; otherwise use PostgreSQL/Redis already running on localhost.
- `local`: never contacts Kubernetes; requires PostgreSQL on `POSTGRES_LOCAL_PORT` and Redis on `REDIS_LOCAL_PORT`.
- `k8s`: require a reachable Kubernetes cluster and port-forward PostgreSQL/Redis from the configured namespace.

For a normal laptop development setup without Docker Desktop Kubernetes:

```text
DEV_INFRA_MODE=local
POSTGRES_LOCAL_PORT=5432
REDIS_LOCAL_PORT=6379
```

Then run `npm run start-dev:windows` or `bash scripts/start-dev.sh`.

Before the first API start after a schema update, validate and generate Prisma:

```bash
npm run prisma:validate
npm run db:generate
npx prisma migrate status
```

The multi-tenancy schema intentionally uses a named `ClinicDefaultMemberships` relation between `Clinic.defaultMemberships` and `OrganizationMembership.defaultClinic`. Do not reintroduce a second `Clinic.memberships` relation unless a real `clinicId` foreign key is added to `OrganizationMembership` and both Prisma relation sides are explicitly named.
