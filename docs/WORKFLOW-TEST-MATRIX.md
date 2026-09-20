# Clinic workflow acceptance matrix

Execute in an isolated test tenant with seeded test data.

1. **Patient** — create patient, verify tenant isolation, verify history access.
2. **Appointment** — select doctor/clinic/service, create appointment, verify overlap protection and status history.
3. **Token/Queue** — issue queue ticket, verify unique token for clinic/date, call/start/complete the ticket.
4. **Consultation** — create consultation against appointment/patient/doctor, verify PHI is tenant-scoped and response is `no-store`.
5. **Prescription** — create prescription and medicine/product items, verify prescription is visible only to authorized roles.
6. **Lab** — create/finalize lab report, verify patient history linkage.
7. **Billing** — create invoice, verify totals and patient/organization relationship.
8. **Payment** — create payment using an Idempotency-Key, retry the same request and verify duplicate processing is rejected.
9. **Patient History** — verify appointments, consultations, prescriptions, medical records, lab reports, invoices and payments are linked to the patient.
10. **Admin** — verify tenant/user/RBAC administration.
11. **Doctor** — verify clinical read/write permissions and inability to access another organization.
12. **Receptionist** — verify appointment/queue/billing permissions and inability to modify clinical records without the required permission.

Security regressions to include in every run: invalid JWT, expired JWT, revoked session, cross-tenant object ID, missing permission, malformed DTO, oversized payload, excessive login attempts, invalid Origin when CSRF protection is enabled, and missing Idempotency-Key on protected create operations.
