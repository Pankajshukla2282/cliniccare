# ClinicCare - Business Requirements Document (BRD)

Version 1.0 | Owner: ClinicCare Product | Status: Approved baseline
Classification: Internal / Confidential

## 1. Executive summary

ClinicCare is a white-label, multi-tenant (SaaS) digital clinic platform. Each
subscribing clinic is a tenant with its own subdomain, its own branded skin, and
its own fully isolated data island, while sharing one single codebase and one
platform deployment owned by ClinicCare. The product replaces paper-based clinic
operations with software across front desk, doctors, clinical records, EECP +
skin-care therapy, product sales, billing, and multi-role staff access.

## 2. Business background and problem statement

Clinics today run on a mix of paper registers, spreadsheets, WhatsApp contact,
and incompatible desktop apps. Patient data is fragmented, follow-ups are
missed, per-therapy courses (EECP/EECP+) are not tracked end-to-end, and there
is no billing/product ledger. Clinic owners cannot see a single consolidated
view, and staff cannot be granted granular roles.

A second, compounding problem: any clinic that buys software is effectively
buying a separate deployed product. That model does not scale for a platform
business wanting to onboard many clinics cheaply.

### 2.1 Goals

- G1. Onboard a new clinic as a tenant in minutes via an online signup + tenant
      provisioning flow, not a multi-week install.
- G2. Give each tenant a branded subdomain experience (theme, logo, colors,
      metadata) without touching code.
- G3. Provide role-based access control (RBAC) scoped per organization so staff
      see only what their role permits.
- G4. Track the full patient journey: appointment, consultation, prescription,
      treatment course, product order, invoice/payment.
- G5. Guarantee tenant isolation - no cross-tenant data leakage, by design.
- G6. Support the initial two-doctor model (EECP + metallic detox; skin care /
      cosmetics) and scale to more doctors, branches, and board-in clinics
      without re-architecture.

### 2.2 Non-goals (v1)

- Public patient-facing booking site for arbitrary end-customers (clinic's own
  branded portal instead).
- Offline/standalone single-tenant desktop product.
- No third-party app marketplace; no support for arbitrary third-party modules.

## 3. Product vision statement

For clinics that operate multi-doctor, multi-branch practice, ClinicCare is the
software platform that runs the entire clinic - front desk, clinical, therapy,
products, and billing - in one tenant-scoped, branded experience, delivered as a
service so the clinic never maintains its own servers.

## 4. Users and personas

| Persona | Description | Primary needs | Outcome |
|---------|-------------|---------------|---------|
| Platform admin (SUPER_ADMIN) | ClincCare staff | Tenancy console, RBAC matrix, monitor all orgs | Manage platform health |
| Tenant org owner / admin | Clinic management | Onboard staff, set branding, configure roles | Run the clinic |
| Receptionist / front desk | Handles walk-ins | Booking, check-in, appointment mgmt | Fill the calendar |
| Doctor | EECP/skin doctors | Consult, diagnose, prescribe, order therapy/product | Treat patients |
| Nurse / technician | Executes therapy courses | EECP/EECP+ course execution and progress notes | Deliver courses |
| Patient | Service recipient | Sessions, products, invoices, portal | Get treated |
| Billing / accounts | Manages money | Invoices, payments, orders, reports | Collect revenue |

## 5. Scope (feature inventory by domain)

The product is organized into 21+ domain modules implemented in the NestJS API,
covering:

- Auth (login, register, refresh, password reset) and tenant signup
- Organization and tenant management (provisioning, metadata, branding)
- Tenancy/RBAC (org-scoped roles, permissions matrix, per-org isolation)
- Doctors, patients, users; appointments and scheduling
- Consultations (documentation, diagnosis)
- Prescriptions (release + fulfillment)
- Clinical: treatments, EECP/EECP+ therapy courses, documents, skin care
- Product catalog, orders, and commerce
- Billing and invoices, payments ledger
- Clinics / branches, CMS/content, dashboard and reporting

Detailed behavioral requirements for each module are captured in the Technical
Design Document and the traceability matrix in Section 9.

## 6. Functional requirements (priority: P0 must, P1 should, P2 could)

### 6.1 Multi-tenancy and branding (P0)

- FR-1: Each tenant gets a unique organization identity and a subdomain.
- FR-2: Subdomain determines tenant branding (theme colors, logo, fonts,
       metadata) applied at runtime via middleware.
- FR-3: All data rows are scoped by organization (tenant-keyed); cross-tenant
       reads are blocked.
- FR-4: Platform super-admin can view/manage all organizations via a tenancy
       console.

### 6.2 Authentication and RBAC (P0)

- FR-5: Auth supports login, registration, refresh tokens, password reset.
- FR-6: RBAC is org-scoped: users have roles; roles grant permissions.
- FR-7: Seeded matrix: SUPER_ADMIN (platform), and tenant roles (owner/admin,
       receptionist, doctor, nurse, billing, etc.).

### 6.3 Patient journey (P0)

- FR-8: Tenant signup + onboarding flow (multi-page), creating the tenant and
       its admin.
- FR-9: Appointments: create, schedule, reschedule, cancel; check-in.
- FR-10: Consultation: doctor documents encounter, diagnosis, related clinical
        data; sequence covers consult -> prescription -> order.
- FR-11: Prescriptions released for fulfillment.
- FR-12: Treatment courses (EECP/EECP+) with progress tracking across sessions.
- FR-13: Product orders with line items, and billing/invoice + payment ledger.

### 6.4 Cross-cutting (P1)

- FR-14: Dark mode + tenant themed UI consistency.
- FR-15: Reports/dashboard for operations and revenue.
- FR-16: Audit-friendly, deterministic seed + validation for the schema.

### 6.5 Deferred (P2)

- Patient-facing public portal, clinic-staff full dashboard, super-admin deep
  analytics, checkout/payment provider integration, SMS/WhatsApp delivery.

## 7. Non-functional requirements

| Id | Area | Requirement |
|----|------|-------------|
| NFR-1 | Performance | API autoscaling (HPA) in production; consistent <500ms p95 for core flows |
| NFR-2 | Scalability | Add tenants without re-architecture; Postgres + Redis scale path |
| NFR-3 | Security | Org-scoped isolation by default; secrets never committed; RBAC enforced at service layer |
| NFR-4 | Reliability | Kubernetes-managed Postgres+Redis with PVC persistence; health probes |
| NFR-5 | Deployment | Kubernetes-only (no Docker Compose); single image build for api/web |
| NFR-6 | Portability | Runs on any CNCF-compliant cluster |
| NFR-7 | Maintainability | Monorepo with shared Prisma schema; typed language; generated docs |
| NFR-8 | Usability | Tenant on-brand skin by subdomain; dark mode; shadcn/ui design system |

## 8. Assumptions, dependencies, constraints

- Assumptions: each tenant is an independent clinic; tenants do not share
  patient data; clinic domain names map to tenant subdomains.
- Dependencies: PostgreSQL (persistence), Redis (cache/queue), Internet for
  CDN-rendered diagrams preview (mermaid.live vs local).
- Constraints: Kubernetes-only deployment; no real payment/SMS providers in
  v1; TLS/ingress hostnames use cliniccare.local dev mapping initially.

## 9. Traceability matrix (module -> coverage)

| Domain module | Requirement ids | Status |
|---------------|-----------------|--------|
| Auth | FR-5 | Implemented |
| Tenants / org provisioning | FR-1, FR-2, FR-4, FR-8 | Implemented |
| Tenancy/RBAC | FR-6, FR-7, NFR-3 | Implemented |
| Appointments | FR-9 | Implemented |
| Consultations | FR-10 | Implemented |
| Prescriptions | FR-11 | Implemented |
| Treatments / EECP courses | FR-12 | Implemented |
| Orders / products | FR-13 | Implemented |
| Billing / invoices / payments | FR-13 | Implemented |
| Web theming (subdomain) | FR-2, FR-14 | Implemented |
| Patient portal / full dashboards / checkout / SMS | FR-15, FR-16 partial | Deferred |

## 10. Sign-off

Business owner: __________________   Date: ________
Product owner: ____________________   Date: ________
