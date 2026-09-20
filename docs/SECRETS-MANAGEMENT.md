# Secrets management

Production must inject secrets at runtime from a managed secret store (for example AWS Secrets Manager/SSM Parameter Store, Azure Key Vault, or Kubernetes Secrets backed by an external secret manager).

Required production secrets:

- `DATABASE_URL`
- `JWT_SECRET`
- payment/provider credentials when enabled
- email/SMS/WhatsApp provider credentials when enabled
- `PHI_ENCRYPTION_KEY` when encrypted application fields are enabled

Rules:

1. Never commit secrets to Git.
2. Never put secrets in Docker images or frontend `NEXT_PUBLIC_*` variables.
3. Never expose `DATABASE_URL`, `JWT_SECRET`, or provider secrets to the browser.
4. Rotate JWT/refresh and provider secrets according to organizational policy.
5. Audit secret access at the infrastructure layer.
6. Use separate secrets for development, staging and production.
