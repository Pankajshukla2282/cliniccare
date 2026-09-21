# ClinicCare - Technical Design Document (TDD)

Version 1.1 | Status: Approved baseline (matches implemented codebase)
Related: docs/brd.md, docs/architecture-diagrams.md, docs/sow.md, docs/rfp.md

## 1. Purpose and scope

This Technical Design Document records how ClinicCare is actually built so that
engineering, Q/A, and new joiners have one authoritative reference. It is a
description of the implemented system, not a forward-looking plan. Sources of
truth: `prisma/schema.prisma`, `apps/api/src`, `apps/web`, and the
`infrastructure/k8s` manifests.

## 2. Architecture at a glance

- Monorepo (npm workspaces) with three deployable roots: `apps/api` (NestJS),
  `apps/web` (Next.js 16 App Router), and `infrastructure/k8s` (Kubernetes
  manifests). Prisma is hoisted at `prisma/`.
- Multi-tenant SaaS: each clinic is a tenant on its own subdomain with its own
  branding and a fully org-scoped data island. Isolation is enforced in the
  API, not just by convention.
- Kubernetes-only deployment (no Docker Compose). PostgreSQL and Redis run
  in-cluster; the API and web scale via HPA.
- Shared Prisma schema (`55 models`, `13 enums`) validated by `prisma:validate`.

## 3. Repo layout

```
cliniccare/
├── prisma/
│   ├── schema.prisma        # 55 models, 13 enums, composite tenant-scoped keys
│   ├── seed.ts              # idempotent: platform org + SUPER_ADMIN, demo tenant, RBAC matrix
│   ├── .env.example
│   └── migrations (if present) / db push workflow
├── apps/
│   ├── api/                 # NestJS, 24 module controllers, port 3000, Swagger /docs
│   └── web/                 # Next.js 16, port 3100, tenant subdomain theming
├── infrastructure/k8s/      # namespace cliniccare, postgres+PVC, redis,
│                            # api/web deployments, HPA, ingress
└── package.json             # workspaces root; db / prisma / build scripts
```

## 4. Tech stack (exact)

| Layer            | Choice                                          |
|------------------|-------------------------------------------------|
| API framework    | NestJS + TypeScript (24 module controllers)     |
| ORM / data       | Prisma (`schema.prisma`)                         |
| Database         | PostgreSQL (in-cluster, PVC-backed)              |
| Cache / queue    | Redis + BullMQ                                   |
| Web              | Next.js 16 App Router, TypeScript, Tailwind      |
| UI kit           | shadcn/ui, dark mode, per-subdomain theming      |
| RBAC             | org-scoped roles + permissions matrix (seed)     |
| Deploy           | Kubernetes (HPA, ingress), no Docker Compose     |
| API docs         | Swagger at `http://localhost:3000/docs`          |

## 5. Multi-tenancy and isolation (design)

- Tenancy is represented by an Organization (tenant) entity; authentication
  resolves the tenant from the request context (subdomain/domain + session).
- Every tenant-scoped model carries a composite key or a foreign key back to
  the organization, so queries are naturally org-scoped.
- RBAC is org-scoped: platform `SUPER_ADMIN` can see all orgs; tenant staff see
  only rows within their org. `FR-4` (platform tenancy console) is implemented.
- Theming: tenant branding (logo, palette, fonts, metadata) is resolved per
  subdomain; `apps/web` applies it at runtime. Subdomain demo uses
  `*.cliniccare.local` dev mapping.

## 6. Functional architecture by module (24 controllers)

| Module controller | Responsibility |
|-------------------|----------------|
| auth / tenants / rbac | Login, register, refresh, reset; tenant signup + provisioning; RBAC matrix |
| appointments | Booking, schedule, reschedule, check-in |
| consultations / clinical / doctors | Consult documentation, diagnosis, clinical records |
| prescriptions / orders | Prescription release and fulfillment flow |
| treatments | EECP / EECP+ therapy courses and progress |
| billing / invoices / payments | Invoicing, payment ledger, B2B-like billing |
| patients / clinics / users | Patient records, branch orgs, staff |
| products / catalog / skin | Product catalog, skin-care catalog and orders |
| documents / cms / public | Attachments, CMS content, public portal routes (org-scoped) |
| notifications / engagement | In-platform notifications, engagement |
| reports / dashboard / search / audit / health | Analytics, dashboards, search, audit trail, health checks |

Traceability to BRD FRs is in `docs/brd.md` section 9.

## 7. Data model highlights (Prisma)

- 55 models across SaaS (org, membership, RBAC), clinical (patients, visits,
  diagnoses, treatments), commerce (products, orders, line items), billing
  (invoices, payments), and platform support (documents, notifications).
- Enumerations (13) cover statuses, roles, and clinical/catalog types.
- Organization scoping is applied on tenant-owned models; see
  `docs/architecture-diagrams.md` d04 ER + d09 RBAC for the visual mapping.

## 8. Non-functional design (NFRs)

| Id   | Area          | Design commitment |
|------|---------------|-------------------|
| NFR-1| Performance   | HPA-driven scaling; sub-500ms p95 for core flows |
| NFR-2| Scalability   | Add tenants without re-architecture |
| NFR-3| Security      | Org-scoped isolation; secrets never committed; RBAC at service layer |
| NFR-4| Reliability   | K8s Postgres+Redis PVC persistence; health probes |
| NFR-5| Deployment    | Kubernetes only; single api/web image build |
| NFR-6| Portability   | Any CNCF-compliant cluster |
| NFR-7| Maintainability| Monorepo shared schema, generated clients |
| NFR-8| Usability     | Branded subdomain theming, dark mode, shadcn/ui |

## 9. Interfaces

- Internal API: REST + Swagger (`/docs`), JSON; NestJS validation pipes.
- Tenant web: subdomain theming via Next.js proxy + theme registry.
- External (deferred): patient portal checkout, payment provider, SMS/WhatsApp.

## 10. Sign-off

Engineering lead: ______________  Date: ______
Q/A lead:          ______________  Date: ______

## Multi-tenant context, environments and RBAC

ClinicCare separates deployment environments from tenant data. Development, staging and production use independent databases, Redis, secrets, storage and runtime namespaces. `APP_ENV` identifies the deployment environment; `Organization` identifies the tenant.

A user can belong to multiple organizations through `OrganizationMembership`. `UserRole` assignments can be organization-scoped or clinic-scoped. The authenticated request selects the active tenant with `X-Tenant-Slug` and optionally the clinic with `X-Clinic-Id`; `TenantAccessGuard` validates both against database state on every protected request.

Effective permissions are calculated from the roles active for the selected tenant/clinic plus platform and tenant-specific `RolePermission` rows. JWT permissions are treated as transport hints only; database RBAC is authoritative.

Role assignment rules prevent tenant administrators from granting `SUPER_ADMIN`. Platform administrators manage tenant lifecycle and cross-tenant membership.
