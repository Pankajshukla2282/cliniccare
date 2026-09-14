# ClinicCare — Deployment & Local Run Runbook

Everything verified against the current tree (`E:\Pankaj\ClinicCare\cliniccare`,
Node 24.x, Windows + PowerShell 5.1, docker-desktop Kubernetes). Two tracks:

- **A — Run everything locally** (PostgreSQL/Redis in-cluster via port-forward,
  API + web as dev/standalone processes). This is the fast inner loop.
- **B — Deploy to the cluster** (build `cliniccare/api:dev` +
  `cliniccare/web:dev`, apply the kustomization, expose via ingress).

## Prereqs

- Node.js >= 18 (repo uses 24.x), npm workspaces monorepo
- Kubernetes running (docker-desktop) + `kubectl` against it
- `DATABASE_URL` for local Prisma CLI work:

```powershell
$env:DATABASE_URL = "postgresql://clinic:clinic-change-me@localhost:5432/cliniccare"
```

---

## Track A — Local development

### A1. Bring up PostgreSQL + Redis (in-cluster, once)

```powershell
cd E:\Pankaj\ClinicCare\cliniccare
kubectl apply -f infrastructure/k8s/00-namespace.yaml
kubectl apply -f infrastructure/k8s/10-postgres.yaml
kubectl apply -f infrastructure/k8s/11-redis.yaml
kubectl get pods -n cliniccare            # wait until Running (1/1)
```

Then forward the DB + cache to localhost so API/web can connect:

```powershell
# run each in its own terminal
kubectl port-forward svc/postgres -n cliniccare 5432:5432
kubectl port-forward svc/redis    -n cliniccare 6379:6379
```

Keep these terminals open while developingchers. Verify port 5432 is listening
before proceeding (`Get-NetTCPConnection -LocalPort 5432 -State Listen`).

### A2. Install + generate Prisma client

```powershell
npm install --no-audit --no-fund
$env:DATABASE_URL = "postgresql://clinic:clinic-change-me@localhost:5432/cliniccare"
npx prisma generate --schema prisma/schema.prisma
npx prisma db push --schema prisma/schema.prisma   # sync dev schema (local DB)
```

### A3. Seed (idempotent)

```powershell
npx ts-node prisma/seed.ts   # platform org + SUPER_ADMIN, demo tenant (brand settings), RBAC matrix
```

Creds from seed:

| Who            | Email                        | Password        |
|----------------|------------------------------|-----------------|
| Super admin    | `superadmin@cliniccare.local`| `SuperAdmin123!`|
| Tenant admin   | `admin@cliniccare.local`     | `ChangeMe123!`  |

### A4. Run the API

```powershell
npm run start:dev --workspace=apps/api
# -> http://localhost:3000   swagger at http://localhost:3000/docs
```

Health: `GET http://localhost:3000/healthz` → `{"status":"ok","service":"cliniccare-api",…}`.

### A5. Run the web app

```powershell
npm run dev --workspace=apps/web
# -> http://localhost:3100
```

Health: `GET http://localhost:3100/healthz`.

> Both servers need `DATABASE_URL` exported in the terminal where they start.
> The web is dynamic (subdomain theming) and reads tenant settings through
> Prisma at request time, so it also needs the DB reachable on 5432.

### A6. Verify multi-tenant theming locally

Point the tenant subdomain at localhost, then open the branded skin:

```
# add to %SystemRoot%\System32\drivers\etc\hosts
127.0.0.1 cliniccare-demo.localhost
```

Then:
- `http://cliniccare-demo.localhost:3100/` → teal tenant theme, tenant meta/title, org-scoped banner
- `http://localhost:3100/` → default blue platform theme
- Dev-only query fallback: `http://localhost:3100/?tenant=cliniccare-demo`

Quick CLI check (no hosts edit needed):

```powershell
curl.exe -s -H "Host: cliniccare-demo.localhost" "http://127.0.0.1:3100/" | Select-String -Pattern "cliniccare-demo"
```
Expect an `x-tenant-subdomain: cliniccare-demo` response header and tenant-branded HTML.

---

## Track B — Deploy to the cluster

### B1. Build app images (requires Dockerfiles in apps/api, apps/web)

```powershell
cd E:\Pankaj\ClinicCare\cliniccare
docker build -t cliniccare/api:dev -f apps/api/Dockerfile .
docker build -t cliniccare/web:dev -f apps/web/Dockerfile .
```
(Images are pulled with `IfNotPresent` locally so you can iterate without a registry.)

### B2. Apply the platform

```powershell
kubectl apply -k infrastructure/k8s/
kubectl get pods -n cliniccare        # api, web: Running
kubectl get ingress -n cliniccare
```

### B3. Ingress hostnames (update /etc/hosts)

```
127.0.0.1 api.cliniccare.local web.cliniccare.local
```

- `http://api.cliniccare.local/` → API
- `http://web.cliniccare.local/` → web (platform theme)
- `http://cliniccare-demo.cliniccare.local/` → tenant-branded web (add to HPA/ingress rule)

---

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| API `ECONNREFUSED 5432` | port-forward not running — start `kubectl port-forward svc/postgres … 5432:5432` |
| `P1012: Schema validation` on `db push` | stale schema — run `npm run prisma:validate` + `npx prisma generate` first |
| `ImagePullBackOff` on api/web in k8s | images not built (Track B1) — build `cliniccare/api:dev` / `cliniccare/web:dev` first |
| Web 500 on tenant subdomain | organization row/slug missing — run `npx ts-node prisma/seed.ts` |
| `… organizationId ____ not found` 404 | cross-tenant access is intentionally blocked (org-scoped isolation) |
| Port 3000/3100 busy | change dev port or stop the existing process (`Get-NetTCPConnection -LocalPort …`) |

---

## Related files
- [`docs/diagrams/index.html`](diagrams/index.html) — browsable
  architecture diagrams (9 subpages, Mermaid v11 via CDN)

- `infrastructure/k8s/` — namespace, postgres, redis, api, web, HPA, ingress (kustomization)
- `prisma/seed.ts` + `prisma/schema.prisma` — seed + 40-model validated schema
- `apps/api` — NestJS (auth/RBAC/tenants + domain modules, port 3000)
- `apps/web` — Next.js (Tailwind + shadcn/ui, subdomain tenant theming, port 3100)
