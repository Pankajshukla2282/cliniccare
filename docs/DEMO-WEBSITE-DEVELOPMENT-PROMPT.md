# ClinicCare Microservice Demo Website Development Prompt

## Product Context

ClinicCare is a **decoupled microservice platform** helping clinics manage the complete patient journey across 9 independent services:

- **auth** - JWT authentication, tenant signup, RBAC
- **clinical** - Patients, appointments, consultations, prescriptions
- **billing** - Orders, payments, invoices, refunds
- **product** - Catalog, products, inventory, categories
- **queue** - Queue tickets, patient flow management
- **lab** - Lab reports, diagnostic results
- **cms** - CMS pages, content, engagement
- **api** - Aggregation layer/gateway between frontend and services
- **web** - Next.js frontend with App Router

The demo must look and behave like a credible working product using realistic sample data and complete front-end workflows across all 9 microservices.

### 1. Repository & Implementation Rules

Work within the existing ClinicCare repository and follow its conventions:

- **Reuse existing Next.js App Router, TypeScript, Tailwind, shadcn/ui, theme provider**, tenant theme utilities, API client, and existing wireframe domain vocabulary
- **Reuse existing API endpoints and Prisma data contracts** where available across all 9 microservices
- **Keep parent/core functionality separate** from tenant-specific branding and layout overrides
- **Use tenant slug as the canonical tenant context** — never treat a client-supplied organization ID as authorization proof
- **Preserve organization and optional clinic scoping** in every list, detail view, mutation, and search result
- **Respect RBAC** in the UI and API calls. Hide or disable actions that the active role cannot perform, while keeping the UI usable for demo viewers
- **If the API or database is unavailable** during a front-end demo, provide a clearly isolated mock-data adapter with the same shape as the real API across all services. The demo must still run and must not silently replace production API behavior
- **Do not add real payment, SMS, WhatsApp, or external healthcare integrations** — use simulated states and clearly label them as demo behavior
- **Keep demo seed data idempotent and safe to reset** — never use real personal or medical information
- **All state-changing operations add audit entries and idempotency records** across the relevant microservice

### 2. Required Contexts & Personas

Implement a context switcher for the active organization and clinic, plus a demo role switcher or login flow.

**Required sample contexts:**

- **ClinicCare Demo** (`cliniccare-demo`)
  - Main Clinic, Mumbai
  - Pune Skin & Aesthetic
- **Aarogyam Skin & Wellness** (`cliniccare-demo-wellness`)
  - At least one clinic with isolated data across relevant microservices

**Required demo personas** (across microservices):

- **Super admin**: Platform tenant lifecycle and cross-tenant overview across all services
- **Tenant admin**: Organization settings, users, clinics, RBAC, and reports across services
- **Clinic admin**: Clinic operations and staff administration (clinical + billing + product)
- **Doctor**: Appointments, queue, consultations, prescriptions, treatments, and records (clinical + queue)
- **Receptionist**: Patient registration, appointments, queue, leads, and basic billing (clinical + billing)
- **Nurse**: Patient records, treatment sessions, follow-ups, and care support (clinical + lab)
- **Pharmacist**: Products, inventory, orders, prescriptions, and stock actions (product + billing)
- **Accountant**: Invoices, payments, refunds, orders, and revenue reports (billing + product)
- **Content manager**: CMS, FAQs, articles, reviews, and tenant content (cms)
- **Patient**: Own appointments, consultations, prescriptions, records, treatments, documents, orders, and reviews only (across relevant services)

Use the repository's seeded demo accounts when available. Do not display production secrets as real credentials in the UI.

### 3. Required Information Architecture

Build these modules making each route reachable from navigation and deep links, across the relevant microservices:

#### Overview (Super Admin)

- Executive dashboard showing KPIs across all microservices
- Hospital value and ROI view with cross-service metrics
- Recent activity feed with events from all services

#### Patient Journey (across clinical + queue + lab)

- **Patients** — filtered to active tenant/clinic scope
- **Patient 360 detail page** — demographics, contact, full history across clinical + lab + cms
- **Appointments and queue** — booking, queue advancement, state transitions (clinical + queue)
- **Leads and follow-ups** — capture, nurture, conversion (clinical + billing)
- **Reviews and engagement** — patient feedback, ratings (cms + clinical)

**Patient 360** must show:
- Demographics, contact details
- Appointments (across states: today, upcoming, completed, cancelled, no-show)
- Consultations, diagnoses, prescriptions (clinical)
- Medical records, lab results (lab)
- Treatment progress and EECP courses (clinical)
- Skin-care plan and sample images (clinical + product)
- Documents/consents (cms + clinical)
- Invoices, orders (billing)
- Timeline activity filtered to active tenant/clinic

#### Clinical Care (clinical + queue + lab)

- **Consultations and visits** — book, move through states (waiting → in-consultation → completed)
- **Diagnoses and prescriptions** — record complaint, assessment, diagnosis, advice, follow-up date, prescription items
- **Medical records** — SOAP notes, progress notes, attachments
- **Laboratory and diagnostics** — lab orders, results, status tracking (lab)
- **Teleconsultation** — video/phone visit links and status
- **Treatments and EECP/EECP+** — treatment courses, planned sessions, session completion tracking
- **Documents and consents** — upload, consent recording, document timeline (cms + clinical)
- **Skin care** — assessments, recommendations, sample image references, linked services/products

**Demonstrable workflows:**

1. Register/select a patient, book an appointment, move it through confirmed → waiting → in consultation → completed → cancelled → no-show states (clinical + queue)
2. Open a consultation, record complaint, assessment, diagnosis, advice, follow-up date, and prescription items (clinical)
3. Start an EECP/EECP+ treatment course, record planned sessions, mark sessions completed, show progress (clinical)
4. Create a skin assessment, attach sample treatment images, produce recommendations, link recommended services/products (clinical + product)
5. Upload/simulate a document, record consent, show in patient timeline (cms + clinical)
6. Create a lab order/result and expose its status in the patient record (lab)

#### Revenue & Commerce (billing + product + clinical)

- **Billing and payments** — invoices, paid/partial/outstanding states, payment capture, refund flow, order status progression (billing)
- **Orders and cart** — add-to-cart, checkout, order progression (product + billing)
- **Products and inventory** — 8 services across consultation, therapy, and skin-care categories; 10 products with stock levels, batches, reorder thresholds, low-stock warnings, batch/expiry visibility (product)
- **Services and categories** — separate Add Service and Add Category actions, with View/Edit/Delete controls (product)

**Include sample data:**
- Invoices, paid/partial/outstanding states
- Payment capture, refund flow
- Order status progression
- Coupon validation (valid, expired, tenant-specific)
- Stock adjustment, low-stock warnings
- Batch/expiry visibility
- Separate service/category/product management

#### People & Control (across relevant services)

- **Doctors and schedules** — profiles, specialties, schedules, leave blocks, clinic assignment (clinical)
- **Organizations and clinics** — org hierarchy, clinic assignment, RBAC (auth + clinical)
- **Users and RBAC** — user status, role assignment, clinic-scoped permissions (auth + all)
- **Notifications** — read/unread behavior, notification types across services

#### Growth & Content (cms)

- **CMS/public content** — draft, published, and archived states for pages, articles, and FAQs
- **Tenant-branded public content** — using active tenant's logo/colors/name/metadata without leaking content across tenants

#### Insights & Governance (all services)

- **Reports and global search** — find patients, appointments, doctors, products, orders, and content within scope
- **Audit and reliability** — actor, tenant, clinic, entity, action, timestamp, result; demonstrate that repeating the same mutation does not create a duplicate record (idempotency)
- **API / Schema map** — documentation of all API endpoints across microservices
- **Tenant and environment settings** — context switching, tenant isolation verification

**Reports should include:**
- Appointment volume (clinical)
- Revenue collection (billing)
- Outstanding amount (billing)
- Doctor utilization (clinical)
- Patient acquisition (cms)
- Treatment completion (clinical)
- Product sales (product)
- Inventory risk (product)

Search should find patients, appointments, doctors, products, orders, and content within scope.

Audit should show actor, tenant, clinic, entity, action, timestamp, and result.

The reliability view should demonstrate that repeating the same mutation does not create a duplicate record.

### 4. Sample Data Requirements

Create enough connected data for every page to look populated on first load across all 9 microservices. Use clearly fictional data based in India, with INR currency and dates that are easy to understand in a demo.

**Include at minimum:**

- **2 organizations** and **3 clinics total** (across auth + clinical)
- **10 patients** with varied statuses, appointment history, treatment plans, and lifetime values (clinical + queue + lab)
- **3 doctors** across EECP/therapy and dermatology/skin care (clinical)
- **12 appointments** across today, upcoming, completed, cancelled, and no-show states (clinical + queue)
- **Queue records** with at least one waiting and one in-consultation patient (queue)
- **Consultations**, **diagnoses**, **prescriptions**, **medical records**, **lab results**, **documents**, and **consents** (clinical + lab + cms)
- **2 EECP/EECP+ courses** with mixed completed, scheduled, and missed sessions (clinical)
- **3 skin assessments** with recommendations and sample image references (clinical + product)
- **8 services** across consultation, therapy, and skin-care categories (product)
- **10 products**, categories, stock levels, batches, reorder thresholds, and at least one low-stock item (product)
- **5 orders**, **8 invoices**, payments, a partial payment, and a refund (billing)
- **3 coupons** with valid, expired, and tenant-specific examples (billing + product)
- **Leads**, **follow-ups**, **reviews**, **notifications** (clinical + cms)
- **CMS pages**, **articles**, and **FAQs** (cms)
- **Audit records** and **idempotency records** for visible demo mutations (all services)

**All records must carry or resolve to the correct organization and clinic context.**

**Visible context-switching demonstration** where data changes and cross-tenant records cannot be opened across relevant microservices.

### 5. Functional Interaction Requirements

Implement real client-side or API-backed behavior for navigation, breadcrumbs, search, filters, sorting, pagination, and URL state across microservices.

**Create, view, edit, archive/delete** with confirmation where appropriate across services.

**Appointment booking**, queue advancement, consultation completion, and follow-up scheduling (clinical + queue).

**Prescription and order item selection** from the catalog (product + clinical).

**Invoice creation**, payment capture, refund, coupon application, and stock adjustment (billing + product).

**CMS draft/publish actions** (cms).

**Notification read/unread actions** across services.

**Tenant and clinic switching** — data changes consistently; cross-scope access prevented across all services.

**Role switching/login** and permission-aware actions across services.

**CSV export** for at least: patients, appointments, billing, and inventory (across relevant services).

**Reset demo data** to its original seed state across all services.

**Loading skeletons, empty states, validation errors, API errors, and permission-denied states** across services.

**Optimistic UI** only where rollback behavior is implemented. Show a toast or inline result for successful and failed actions. **Destructive operations** must be reversible where domain-appropriate or require confirmation across services.

### 5. Security & Data-Isolation Demonstration (Microservice-Aware)

The demo must visibly and technically reinforce these rules:

- **Active organization** is resolved from tenant context and membership across services
- **Optional clinic context** must belong to the active organization across services
- **Patient users** can only see their own records across services
- **Clinic-scoped staff** cannot see another clinic's restricted data across services
- **Switching** from `cliniccare-demo` to `cliniccare-demo-wellness` changes all tenant-owned lists across relevant services
- **Search, exports, dashboards, and detail routes** use the same scope rules as normal lists across services
- **Unauthorized actions** show a clear permission-denied state across services
- **All state-changing demo operations** add an audit entry and idempotency record across the relevant microservice

⚠️ **Do not claim that front-end hiding alone provides security.** Where a backend exists (all 9 microservices), enforce the same rules server-side.

### 5. Definition of Done (Microservice-Comprehensive)

The demo is complete only when:

- ✅ A new viewer can open the app and understand the clinic's current operational state within 30 seconds across relevant services
- ✅ Every required module is reachable and has populated sample data across services
- ✅ The main workflows can be completed without editing source code across services
- ✅ **Create/view/edit/delete or equivalent lifecycle actions** work for operational modules across services
- ✅ **All role views** show appropriate navigation and permissions across services
- ✅ **Tenant and clinic switching** changes data consistently and prevents cross-scope access across services
- ✅ The website works at desktop and mobile widths and supports light/dark mode across services
- ✅ **No primary control is a dead button** or points to an unfinished route across services
- ✅ **Refresh/deep-link navigation** preserves the current route and safe context across services
- ✅ The app has **no console errors** in the main demo flows across services
- ✅ The README includes local run instructions, demo accounts or a safe login path, seed/reset instructions, and the demo URL
- ✅ **Focused tests** for tenant isolation, role visibility, appointment progression, billing mutation idempotency, and patient self-scope across services
- ✅ **Tests run across all relevant microservices** (not just one)

### 6. Delivery Format

Deliver:

1. **The implemented demo website** in the existing application structure (all 9 microservices)
2. **An idempotent sample-data seed or mock adapter** that works across services
3. **Concise setup and run instructions** (updated for microservice architecture)
4. **A route/module inventory** listing all reachable routes per microservice
5. **A short list of implemented demo workflows** across services
6. **Focused automated tests** and the commands used to run them (vitest/jest across services)
7. **A note identifying simulated integrations** and any intentionally deferred production features across services

**Before presenting the result**, run the available typecheck, lint, test, and production build commands across all services, and fix errors introduced by the implementation.

### 7. Simulated Integrations (Clearly Labeled)

The following integrations are **simulated** for demo purposes only and do not represent production behavior:

- **Payment processing** — simulated states, no real gateway integration
- **SMS/WhatsApp notifications** — simulated states only
- **External healthcare APIs** — mocked responses only
- **Third-party authentication** — demo accounts only
- **Email services** — simulated email content only

These are clearly labeled in the UI as "demo mode" behavior.

### 8. Technical Notes

- The frontend (Next.js) communicates with the API gateway (`/api/` prefix) which routes to the appropriate microservice
- Each microservice has its own Prisma schema and database isolation via `organizationId`
- API gateway routes requests based on `X-Tenant-Slug` header
- Demo data is seeded using tenant slugs, not hard-coded IDs
- All state-changing operations include audit entries and idempotency keys
- The frontend API client includes tenant context in all requests
- Role-based UI visibility is enforced both client-side (UX) and server-side (API guards)

### 8. Before Presenting

Run these commands across all relevant microservices and fix any errors:

```powershell
npm run typecheck:api   # API + auth typecheck
npm run typecheck:web   # Web typecheck
npm run lint            # Lint all TypeScript
npm run build:api       # Build API
npm run build:web      # Build web
npm run test            # Run unit/tests (if configured)
# Then fix any errors before presenting
```