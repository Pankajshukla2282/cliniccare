# ClinicCare Demo Website Development Prompt

Copy the prompt below into an AI coding tool or use it as the implementation brief for the ClinicCare demo website.

---

## Prompt

You are a senior product engineer and UX designer. Build a polished, fully navigable demo website for **ClinicCare**, a white-label, multi-tenant digital clinic platform. The demo must look and behave like a credible working product, using realistic sample data and complete front-end workflows rather than placeholder cards or dead buttons.

### 1. Product context

ClinicCare helps clinics manage the complete patient journey in one system:

- tenant and clinic administration
- patient and doctor directories
- appointments, scheduling, and queue management
- consultations, diagnoses, prescriptions, and medical records
- EECP/EECP+ therapy courses and session tracking
- dermatology and skin-care assessments, plans, images, and recommendations
- laboratory and diagnostic workflows
- documents and patient consents
- products, inventory, batches, services, categories, and coupons
- orders, cart, checkout, invoices, payments, and refunds
- leads, follow-ups, reviews, and notifications
- CMS pages, articles, FAQs, and tenant branding
- reports, global search, audit logs, and idempotent operations

This is a clinic operations product, not a generic marketing landing page. The first screen must be a useful authenticated operations dashboard.

### 2. Repository and implementation rules

Work within the existing ClinicCare repository and follow its conventions.

- Reuse the existing Next.js App Router, TypeScript, Tailwind, shadcn/ui, theme provider, tenant theme utilities, API client, and existing wireframe domain vocabulary.
- Reuse existing API endpoints and Prisma data contracts where available. Do not invent conflicting model names or duplicate domain concepts.
- Keep parent/core functionality separate from tenant-specific branding and layout overrides.
- Use tenant slug as the canonical tenant context. Never treat a client-supplied organization ID as authorization proof.
- Preserve organization and optional clinic scoping in every list, detail view, mutation, and search result.
- Respect RBAC in the UI and API calls. Hide or disable actions that the active role cannot perform, while keeping the UI usable for demo viewers.
- If the API or database is unavailable during a front-end demo, provide a clearly isolated mock-data adapter with the same shape as the real API. The demo must still run and must not silently replace production API behavior.
- Do not add real payment, SMS, WhatsApp, or external healthcare integrations. Use simulated states and clearly label them as demo behavior.
- Keep demo seed data idempotent and safe to reset. Never use real personal or medical information.

### 3. Visual and UX direction

Create a calm, premium clinical operations interface with a distinct ClinicCare identity.

- Use a strong editorial type pairing, restrained color variables, accessible contrast, and a light/dark theme toggle.
- Support responsive desktop, tablet, and mobile layouts. The dense desktop workspace should remain usable on small screens without horizontal page breakage.
- Use a persistent sidebar or responsive navigation, top bar with tenant/clinic context, global search, notifications, profile menu, and breadcrumbs.
- Use tables for operational lists, detail views for records, tabs for related patient data, filters for repeated workflows, and drawers/modals for short create/edit actions.
- Every important action must provide loading, success, empty, validation, and error states.
- Use familiar icons from the existing icon library. Tooltips should explain unfamiliar icon-only controls.
- Avoid decorative marketing sections, oversized hero copy, nested cards, fake charts, and unexplained placeholder text.
- Use realistic charts only when their underlying demo data is present and inspectable.
- Make keyboard focus, labels, confirmation dialogs, and destructive-action warnings accessible.

### 4. Required contexts and personas

Implement a context switcher for the active organization and clinic, plus a demo role switcher or login flow.

Required sample contexts:

- **ClinicCare Demo** (`cliniccare-demo`)
  - Main Clinic, Mumbai
  - Pune Skin & Aesthetic
- **Aarogyam Skin & Wellness** (`cliniccare-demo-wellness`)
  - at least one clinic with isolated data

Required demo personas:

- Super admin: platform tenant lifecycle and cross-tenant overview
- Tenant admin: organization settings, users, clinics, RBAC, and reports
- Clinic admin: clinic operations and staff administration
- Doctor: appointments, queue, consultations, prescriptions, treatments, and records
- Receptionist: patient registration, appointments, queue, leads, and basic billing
- Nurse: patient records, treatment sessions, follow-ups, and care support
- Pharmacist: products, inventory, orders, prescriptions, and stock actions
- Accountant: invoices, payments, refunds, orders, and revenue reports
- Content manager: CMS, FAQs, articles, reviews, and tenant content
- Patient: own appointments, consultations, prescriptions, records, treatments, documents, orders, and reviews only

Use the repository's seeded demo accounts when available. Do not display production secrets as real credentials in the UI.

### 5. Required information architecture

Build these modules and make each route reachable from navigation and deep links.

#### Overview

- Executive dashboard
- Hospital value and ROI view

Dashboard content must include sample KPI values for today's appointments, patients waiting, revenue collected, outstanding invoices, active treatment courses, low-stock products, doctor utilization, and follow-ups due. Include a recent activity feed and actionable quick links.

#### Patient journey

- Patients
- Patient 360 detail page
- Appointments and queue
- Leads and follow-ups
- Reviews and engagement

Patient 360 must show demographics, contact details, appointments, consultations, prescriptions, medical records, treatment progress, skin-care plan, documents/consents, invoices, orders, and timeline activity, filtered to the active tenant and permitted clinic scope.

#### Clinical care

- Consultations and visits
- Diagnoses and prescriptions
- Medical records
- Laboratory and diagnostics
- Teleconsultation
- Treatments and EECP/EECP+
- Documents and consents
- Skin care

Include these demonstrable workflows:

1. Register or select a patient, book an appointment, move it through confirmed, waiting, in consultation, completed, cancelled, and no-show states.
2. Open a consultation, record complaint, assessment, diagnosis, advice, follow-up date, and prescription items.
3. Start an EECP/EECP+ treatment course, record planned sessions, mark sessions completed, and show progress.
4. Create a skin assessment, attach sample treatment images, produce recommendations, and link recommended services/products.
5. Upload or simulate a document, record consent, and show the document in the patient timeline.
6. Create a lab order/result and expose its status in the patient record.

#### Revenue and commerce

- Billing and payments
- Orders and cart
- Products and inventory
- Services and categories

Include sample invoices, paid/partial/outstanding states, payment capture, refund flow, order status progression, coupon validation, stock adjustment, low-stock warnings, batch/expiry visibility, and separate service/category/product management. Mutations must be duplicate-safe and auditable.

#### People and control

- Doctors and schedules
- Organizations and clinics
- Users and RBAC
- Notifications

Provide doctor profiles, specialties, schedules, leave blocks, clinic assignment, user status, role assignment, clinic-scoped permissions, and notification read/unread behavior.

#### Growth and content

- CMS/public content

Support draft, published, and archived states for pages, articles, and FAQs. Show tenant-branded public content using the active tenant's logo/colors/name/metadata without leaking content across tenants.

#### Insights and governance

- Reports and global search
- Audit and reliability
- API/schema map
- Tenant and environment settings

Reports should include appointment volume, revenue collection, outstanding amount, doctor utilization, patient acquisition, treatment completion, product sales, and inventory risk. Search should find patients, appointments, doctors, products, orders, and content within scope. Audit should show actor, tenant, clinic, entity, action, timestamp, and result. The reliability view should demonstrate that repeating the same mutation does not create a duplicate record.

### 6. Sample data requirements

Create enough connected data for every page to look populated on first load. Use clearly fictional data based in India, with INR currency and dates that are easy to understand in a demo.

Include at minimum:

- 2 organizations and 3 clinics total
- 10 patients with varied statuses, appointment history, treatment plans, and lifetime values
- 3 doctors across EECP/therapy and dermatology/skin care
- 12 appointments across today, upcoming, completed, cancelled, and no-show states
- queue records with at least one waiting and one in-consultation patient
- consultations, diagnoses, prescriptions, medical records, lab results, documents, and consents
- 2 EECP/EECP+ courses with mixed completed, scheduled, and missed sessions
- 3 skin assessments with recommendations and sample image references
- 8 services across consultation, therapy, and skin-care categories
- 10 products, categories, stock levels, batches, reorder thresholds, and at least one low-stock item
- 5 orders, 8 invoices, payments, a partial payment, and a refund
- 3 coupons with valid, expired, and tenant-specific examples
- leads, follow-ups, reviews, notifications, CMS pages, articles, and FAQs
- audit records and idempotency records for visible demo mutations

All records must carry or resolve to the correct organization and clinic context. Include a visible context-switching demonstration where the data changes and cross-tenant records cannot be opened.

### 7. Functional interaction requirements

Implement real client-side or API-backed behavior for:

- navigation, breadcrumbs, search, filters, sorting, pagination, and URL state
- create, view, edit, archive/delete with confirmation where appropriate
- appointment booking, queue advancement, consultation completion, and follow-up scheduling
- prescription and order item selection from the catalog
- invoice creation, payment capture, refund, coupon application, and stock adjustment
- CMS draft/publish actions
- notification read/unread actions
- tenant and clinic switching
- role switching/login and permission-aware actions
- CSV export for at least patients, appointments, billing, and inventory
- reset demo data to its original seed state
- loading skeletons, empty states, validation errors, API errors, and permission-denied states

Use optimistic UI only where rollback behavior is implemented. Show a toast or inline result for successful and failed actions. Destructive operations must be reversible where domain-appropriate or require confirmation.

### 8. Security and data-isolation demonstration

The demo must visibly and technically reinforce these rules:

- active organization is resolved from tenant context and membership
- optional clinic context must belong to the active organization
- patient users can only see their own records
- clinic-scoped staff cannot see another clinic's restricted data
- switching from `cliniccare-demo` to `cliniccare-demo-wellness` changes all tenant-owned lists
- search, exports, dashboards, and detail routes use the same scope rules as normal lists
- unauthorized actions show a clear permission-denied state
- all state-changing demo operations add an audit entry and idempotency record

Do not claim that front-end hiding alone provides security. Where a backend exists, enforce the same rules server-side.

### 9. Definition of done

The demo is complete only when:

- a new viewer can open the app and understand the clinic's current operational state within 30 seconds
- every required module is reachable and has populated sample data
- the main workflows can be completed without editing source code
- create/view/edit/delete or equivalent lifecycle actions work for operational modules
- all role views show appropriate navigation and permissions
- tenant and clinic switching changes data consistently and prevents cross-scope access
- the website works at desktop and mobile widths and supports light/dark mode
- no primary control is a dead button or points to an unfinished route
- refresh/deep-link navigation preserves the current route and safe context
- the app has no console errors in the main demo flows
- the README includes local run instructions, demo accounts or a safe login path, seed/reset instructions, and the demo URL
- add focused tests for tenant isolation, role visibility, appointment progression, billing mutation idempotency, and patient self-scope

### 10. Delivery format

Deliver:

1. the implemented demo website in the existing application structure
2. an idempotent sample-data seed or mock adapter
3. concise setup and run instructions
4. a route/module inventory
5. a short list of implemented demo workflows
6. focused automated tests and the commands used to run them
7. a note identifying simulated integrations and any intentionally deferred production features

Before presenting the result, run the available typecheck, lint, test, and production build commands, and fix errors introduced by the implementation.
