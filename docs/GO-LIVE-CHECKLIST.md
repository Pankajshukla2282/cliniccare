# Go-live checklist

- Node 24.21.0 / npm 11.x
- Production secrets supplied by secret manager
- `DATABASE_URL` and migrations verified
- Strong `JWT_SECRET`
- CORS allowlist exact
- CSRF origin protection enabled where cookie-authenticated browser flows exist
- Rate limits tuned and tested
- Backups/PITR + restore test completed
- Central logs + alerts configured
- TLS enforced at ingress
- Swagger disabled or access-controlled in production
- PHI cache controls verified
- Authentication/RBAC tests pass
- Patient -> appointment -> queue -> consultation -> prescription -> lab -> billing -> payment -> history smoke test passes
- Admin/Doctor/Receptionist permissions verified
- Rollback artifact and database recovery plan available
