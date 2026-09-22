# ClinicCare Hospital Proposal Demo v5

This is a dependency-free proposal/demo UI. It is deliberately separated into:

- `index.html` — shell only
- `styles.css` — presentation
- `schema-map.js` — domain/API/schema alignment manifest
- `app.js` — demo state, workflows, routing and interactions

## Design principle

The previous wireframes accumulated functionality inside one generated HTML file. This version treats the wireframe as a thin presentation client over a domain-shaped demo store. Navigation IDs, domain entities, scope rules, workflow actions and audit/idempotency behavior are centralized.

The uploaded ClinicCare TDD states that the real application has a shared Prisma schema with 55 models and 13 enums, 24 API module controllers, Organization as the tenant boundary, optional clinic narrowing, and database-authoritative RBAC. The approval-pack documents do not contain the literal `prisma/schema.prisma`; therefore this demo uses the documented domain vocabulary and isolates model mapping in `schema-map.js` instead of inventing undocumented Prisma model names.

## Proposal-focused additions

- Executive command centre
- Hospital Value & ROI page
- Revenue leakage / collection visibility
- Capacity / doctor utilization story
- Patient acquisition and retention funnel
- Inventory working-capital controls
- Patient 360° journey
- Clinical, diagnostics, therapy and skin-care workflows
- Billing, payments and duplicate-safe collection demo
- Product/service categories with working **Add Category** flow
- Organization / clinic / RBAC controls
- CMS and engagement workflows
- Audit and idempotency demonstration
- API / Schema Map page
- Environment + tenant + clinic context switching

## Important

Financial opportunity figures are illustrative demo values, not forecasts. Production ROI should be calculated from the hospital's baseline KPIs.

## v5.1 CRUD / Navigation enhancement

All major operational modules now expose a consistent proposal-demo interaction pattern:

- List
- Add / Create
- View
- Edit / Modify
- Delete
- Back to previous page
- Back to module list from record detail

This includes Patients, Appointments & Queue, Leads, Reviews, Consultations, Prescriptions, Medical Records, Laboratory, Teleconsultation, Treatments, Documents, Skin Care, Billing, Orders, Inventory, Services, Categories, Doctors, Organizations, Users, Notifications and CMS.

The Services & Categories screen also exposes separate Add Service and Add Category actions, with View/Edit/Delete controls for both datasets.

All demo mutations continue to use the existing audit/idempotency mutation layer so proposal interactions remain duplicate-safe and auditable.
