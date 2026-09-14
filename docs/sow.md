# ClinicCare - Statement of Work (SOW)

Version 1.0 | Recipient: vendor/implementer | Status: Draft for review
Scope anchor: this SOW is RESTRICTED to the ClinicCare software build (G1-G6
+ NFR-1..8). Cosmetic/clinical domain details are governed by
`docs/brd.md`; technical blueprints by `docs/technical-design.md`.

## 1. Project overview

ClinicCare is a white-label, multi-tenant SaaS platform for digital clinics
(EECP/EECP+ therapy, metallic detox, cosmetic/skin care). One codebase, one
cluster deployment, every clinic = a tenant with branded subdomain + isolated
org-scoped data; RBAC per role; end-to-end patient journey (appt -> consult ->
prescription -> treatment course -> order -> invoice/payment).

## 2. Scope

### 2.1 In scope (build)

1. Monorepo + NestJS API (24 controllers) + Next.js web (branded subdomains).
2. Prisma schema (55 models) + idempotent RBAC/tenant seed.
3. Tenancy: signup + provisioning, org-scoped RBAC matrix, theming by subdomain.
4. Clinical: appointments, consultations, prescriptions, EECP/EECP+ courses,
   docs, skin-care.
5. Commerce: products/catalog, orders, invoices, payments ledger.
6. Platform ops: dashboard, reports, search, audit, health, notifications.
7. Kubernetes deployment (namespace cliniccare) + PostgreSQL/Redis + HPA +
   ingress; runbook.
8. Deliverables as listed in section 4.

### 2.2 Out of scope

- Patient-facing public portal / full checkout / payment-provider integration.
- Clinic-staff analytics dashboards, superficial admin deep analytics.
- SMS/WhatsApp real channels; third-party billing integrations.
- Any non-Kubernetes hosting (Docker Compose explicitly excluded).

## 3. Work plan (phased)

- Phase 0 (foundation): workspaces, Prisma schema+branch net, seed, CI lint.
- Phase 1 (core P0): tenancy, auth/RBAC, org isolation, theming.
- Phase 2 (clinical): patients, appointments, consultations, prescriptions,
  treatments (EECP+).
- Phase 3 (commerce/billing): products, orders, invoices, payments.
- Phase 4 (platform ops): dashboard, reports, search, audit, health, CMS.
- Phase 5 (run + runbook): local quickstart, k8s apply order, docs, handoff.

## 4. Deliverables

| # | Deliverable | Acceptance gate |
|---|-------------|-----------------|
| D1 | Monorepo + schema + seed | `prisma validate` green; seed idempotent |
| D2 | API (all modules) | Swagger `/docs`; 24 controllers; RBAC enforced |
| D3 | Web (theming) | Subdomain theming + dark mode + auth pages |
| D4 | K8s manifests + runbook | `kubectl apply -f` brings 2 pods + db + redis up |
| D5 | BRD + TDD + RFP + diagrams | Docs reviewed against `docs/` |

## 5. Timeline (indicative, TLC = target launch candidate)

- M1 = M0 + 4w: Phase 0-1; M2 = M1 + 5w: Phase 2; M3 = M2 + 4w: Phase 3;
  M4 = M3 + 4w: Phase 4-5 -> TLC ~ M0 + 17 weeks. Buffer: +2 weeks.

## 6. Commercial (placeholder - fill per engagement)

- Fixed price: TBD (quote based on D1-D5). Monthly SaaS (per tenant): TBD -
  suggested anchor of $X/tenant/month + per-doc/API usage if applicable.
- Payment schedule: 30% kick-off, 40% Phase 2 acceptance, 20% Phase 4
  acceptance, 10% final acceptance + docs/handoff.
- Expenses: none (all services are delivered out of our infra).

## 7. Acceptance (def of done for the whole project)

- [x] All BRD P0 functional requirements present in code (traceability 9.x).
- [x] NFR-1..8 satisfied by design (see TDD 8).
- [x] RBAC matrix seeded and org-scoped isolation enforced (no cross-tenant
      data leaks in integration tests).
- [x] Kubernetes-only deployment path works end-to-end (track A local + B
      cluster in runbook).
- [x] Docs (BRD, TDD, RFP, diagrams) committed and consistent with code.

## 8. Assumptions and dependencies

- Node >= 18, a reachable PostgreSQL, and a reachable Kubernetes (docker-
  desktop) are prerequisites; provided by ClinicCare side.
- Prisma generate/seed need a live DB; manifests use `CHANGE_ME` placeholders.
- Internet access required for CDN-rendered diagrams and package registries.

## 9. Contact / signature

ClinicCare rep: ______________   Vendor PM: ______________   Date: ________
