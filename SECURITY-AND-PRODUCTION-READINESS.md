# ClinicCare Stages 2-10 implementation baseline

This package implements a security/clinical/API/reliability/DevOps foundation.

## Security
- JWT authentication with issuer/audience validation.
- Database-backed tenant and role/permission revalidation on every protected request.
- Global throttling plus tighter authentication endpoint throttles.
- Helmet/security headers, strict CORS configuration, optional origin-based CSRF protection.
- Global validation with whitelist + forbidNonWhitelisted.
- Output redaction for secrets/tokens/password hashes.
- PHI responses default to `Cache-Control: no-store`. Request/response bodies are never written to audit logs.
- Secrets are environment/platform injected; production refuses weak/missing JWT secrets and DATABASE_URL.
- Refresh tokens are hashed, rotated, revoked on logout/password change, and never returned by audit logging.
- Audit records are append-only at application level.

## Clinical architecture
Existing Patient, Doctor, Appointment, Consultation, Prescription, Document, MedicalRecord, Billing/Payment/Invoice entities are retained. Stage 2-10 adds Medicine, LabReport, QueueTicket and IdempotencyKey with tenant-scoped indexes and foreign keys.

## Workflow API
`Patient -> Appointment -> QueueTicket -> Consultation -> Prescription -> LabReport -> Invoice/Payment -> Patient History` is represented by the existing clinical/billing modules plus `/queue/tickets` and `/labs/reports`.

## API conventions
- Global `/api/v1` prefix is environment-configurable.
- DTO validation is global.
- Swagger is opt-in through `ENABLE_SWAGGER=true`.
- Error responses contain `errorCode`, `requestId`, timestamp and path.
- Pagination/filtering remains module-specific where already implemented; shared conventions should be applied as endpoints are extended.

## Production operations
Use PostgreSQL managed backups/PITR, platform secret management, centralized log shipping, health/readiness probes, and immutable deployment artifacts. Do not store `.env` files or PHI in source control.
