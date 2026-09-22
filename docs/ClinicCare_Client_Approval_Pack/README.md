# ClinicCare Client Approval Pack

This approval pack now includes a repository-backed, functional demo wireframe rather than a static screen mock-up.

## Open the functional demo

Open `wireframe/index.html` directly in a modern browser.

The demo is dependency-free and stores its demo state in browser `localStorage`. It supports navigation, forms, workflow actions, CSV exports, reset, and idempotent state-changing operations.

## Demo coverage

The wireframe reflects the major application domains in the supplied API:

- Patients, appointments and queue
- Clinical consultations, prescriptions and medical records
- Treatments, packages and sessions
- Labs
- Billing, payments and refunds
- Orders, cart, coupons and checkout
- Products, inventory and batches
- Services/catalog
- Doctors, specialties, schedules and leaves
- Organizations, clinics, rooms and holidays
- Leads, follow-ups and reviews
- Documents and consents
- Skin assessments, treatment images and recommendations
- Notifications
- Users and RBAC
- CMS
- Reports/search
- Audit/idempotency
- Tenant settings

## Documents

- `01_BRD_ClinicCare.docx`
- `02_SOW_ClinicCare.docx`
- `03_RFP_ClinicCare.docx`
- `04_Architecture_ClinicCare.docx`
- `architecture.svg`
- `wireframe/index.html`

## Code review

See `../../CODE-REVIEW-2026-09-21.md` for the startup fixes, duplicate cleanup, validation results, and recommended local verification commands.
