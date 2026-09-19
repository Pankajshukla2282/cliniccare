# QA Engineer Test Scenario: ClinicCare Platform (Local Dev)

## 1. Test Scope
Verify the full ClinicCare platform functions correctly in a **local development environment** (Track A — run everything locally as per `docs/runbook-local.md`). Coverage includes:

- Authentication & authorization
- Multi‑tenant theming & subdomain isolation
- RBAC/permissions (org‑scoped)
- Cross‑tenant data isolation
- API endpoint behavior
- Web UI rendering (Next.js dev)
- Health checks & error handling

## 2. Preconditions
| Item | Requirement |
|------|-------------|
| Node.js | **18 LTS** or **20 LTS** (`nvm use 18` / `nvm use 20`; repo requires `>=18`) |
| OS | Windows 10/11 (PowerShell 5.1) or macOS/Linux |
| Kubernetes | `docker-desktop` with `cliniccare` namespace, pods Running (api, web, postgres, redis) |
| Port forwards | `kubectl port-forward svc/postgres -n cliniccare 5432:5432` and `kubectl port-forward svc/redis -n cliniccare 6379:6379` |
| Database | PostgreSQL `cliniccare` DB, user `clinic`, password from `.env` |
| Prisma | Client generated (`npx prisma generate`), migrations up to date (`npx prisma migrate status`) |
| Seed data | Run `npx tsx prisma/seed.ts` (idempotent; passwords re‑hashed each run) |
| API dev | `npm run start:dev --workspace=apps/api` → `http://localhost:3000` |
| Web dev | `npm run dev --workspace=apps/web` (PORT=3100) → `http://localhost:3100` |
| Host file | `127.0.0.1 cliniccare-demo.localhost` added to `%SystemRoot%\System32\drivers\etc\hosts` (optional, for tenant theming) |

## 3. Test Data (Built‑In)
| Role | Email | Password | Scope |
|------|-------|----------|-------|
| Super admin | `superadmin@cliniccare.local` | `SuperAdmin123!` | platform / all tenants |
| Tenant admin | `admin@cliniccare.local` | `ChangeMe123!` | ClinicCare Demo org |
| Demo tenant | `cliniccare-demo` (subdomain) | — | brand‑specific UI |

## 4. Test Cases

### TC‑01: API Health Check
| Field | Value |
|-------|-------|
| Endpoint | `GET http://localhost:3000/healthz` |
| Expected | HTTP **200** with JSON `{"status":"ok","service":"cliniccare-api",…}` |
| Notes | Requires port‑forward 5432 running |

### TC‑02: Web Health Check
| Field | Value |
|-------|-------|
| Endpoint | `GET http://localhost:3100/healthz` |
| Expected | HTTP **200** |
| Notes | Next.js dev runtime health endpoint |

### TC‑03: Super Admin Login
| Field | Value |
|-------|-------|
| Endpoint | `POST http://localhost:3000/api/v1/auth/login` |
| Payload | `{ "email":"superadmin@cliniccare.local", "password":"SuperAdmin123!" }` |
| Expected | HTTP **200** + JWT token in response body |
| Notes | Token can be used for auth‑protected subsequent calls |

### TC‑04: Tenant Signup (Creates Demo Tenant)
| Field | Value |
|-------|-------|
| Endpoint | `POST http://localhost:3000/api/v1/auth/tenant-signup` |
| Payload | `{ "email":"newdemo@test.local", "password":"TempPass123!", "organizationName":"Demo Org", "plan":"TRIAL" }` |
| Expected | HTTP **201** + organization created (check DB or `GET /api/v1/tenants`) |
| Notes | First tenant in the org gets `CLINIC_ADMIN` role |

### TC‑05: Tenant Admin Login
| Field | Value |
|-------|-------|
| Endpoint | `POST http://localhost:3000/api/v1/auth/login` |
| Payload | `{ "email":"admin@cliniccare.local", "password":"ChangeMe123!" }` |
| Expected | HTTP **200** + JWT token |
| Notes | Token scoped to the demo organization |

### TC‑06: Multi‑Tenant Theming (Host Header)
| Field | Value |
|-------|-------|
| Prereq | `127.0.0.1 cliniccare-demo.localhost` in hosts file |
| Endpoint | `GET http://cliniccare-demo.localhost:3100/` (or use `curl -s -H "Host: cliniccare-demo.localhost" "http://127.0.0.1:3100/"`) |
| Expected | - HTML includes teal/tenant‑branding CSS variables<br>- Response header `x-tenant-subdomain: cliniccare-demo`<br>- Page title/metadata references the demo tenant |
| Notes | Without hosts edit, fallback `?tenant=cliniccare-demo` query param works: `http://localhost:3100/?tenant=cliniccare-demo` |

### TC‑07: RBAC — Org‑Scoped Permissions
| Field | Value |
|-------|-------|
| Endpoint | `GET http://localhost:3000/api/v1/rbac/permissions` (requires JWT from super admin or tenant admin) |
| Expected | - Returns permissions **only** for the organization associated with the token<br>- Cross‑tenant IDs return 404 or empty set |
| Notes | Verify that a tenant admin cannot see another tenant's RBAC entries |

### TC‑08: Cross‑Tenant Isolation (Data)
| Field | Value |
|-------|-------|
| Prereq | Two tenants exist (super admin created one via TC‑04, or use demo org) |
| Action | - Create a record under Tenant A (e.g., appointment, patient, product)<br>- Attempt to list/get the same record type under Tenant B using the same JWT (or a token from Tenant B admin) |
| Expected | - Tenant B's API returns **404** or **forbidden** — data is not visible<br>- RBAC rules enforce `organizationId`‑scoped isolation |
| Notes | Composite unique keys (e.g., `[organizationId, slug]`) must block cross‑tenant access |

### TC‑09: API Swagger UI (Dev Only)
| Field | Value |
|-------|-------|
| Endpoint | `GET http://localhost:3000/docs` |
| Expected | Swagger UI loads, shows all defined endpoints (auth, tenants, RBAC, appointments, clinical, etc.) |
| Notes | Dev‑only; not included in production build |

### TC‑10: Web UI — Basic Rendering
| Field | Value |
|-------|-------|
| Endpoint | `GET http://localhost:3100/` |
| Expected | - Next.js page loads without errors<br>- Tailwind‑styled layout visible<br>- Dark mode toggle works (if present)<br>- No console errors in DevTools |
| Notes | If `?tenant=cliniccare-demo` added, verify branded theme variables appear |

### TC‑11: Public Portal Route Requires organizationId
| Field | Value |
|-------|-------|
| Endpoint | `GET http://localhost:3000/api/v1/patients` (no orgId) or any org‑scoped route |
| Expected | HTTP **404** or **403** with message about missing `organizationId` |
| Notes | Confirms multi‑tenant isolation at the API layer |

### TC‑12: Seed Re‑run Idempotency
| Field | Value |
|-------|-------|
| Action | `npx tsx prisma/seed.ts` (run twice) |
| Expected | - No errors<br>- Demo passwords are re‑hashed (login still works with new passwords)<br>- Org + tenant data unchanged (primary keys not duplicated) |
| Notes | Confirms seed is safe to re-run in dev loop |

## 5. Execution Notes
- All tests should be run **after** the full Track A setup (port‑forwards, prisma migrate, seed, API + web dev servers).
- Use **Postman**, **curl**, or **PowerShell Invoke‑RestMethod** for API calls.
- For web/UI testing, use Chrome/Firefox DevTools; check Console and Network tabs for errors.
- Record any flaky failures; the platform is under active development and some endpoints may shift.
- If using the hosted/runbook cloud pipeline, replace `localhost` with the appropriate ingress hostname (see `runbook-local.md` B4).

## 6. Defect Log Template
| Defect ID | Test Case | Environment | Steps to Reproduce | Actual Result | Expected Result | Priority |
|-----------|-----------|-------------|--------------------|---------------|----------------|----------|
| — | — | — | — | — | — | — |

---

*Document generated for QA engineer use. Aligns with `docs/runbook-local.md` Track A and the repo's multi‑tenant isolation guarantees.*