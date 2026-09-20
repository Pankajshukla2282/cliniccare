# Environment strategy

| Environment | Source of config | Database | Secrets | Swagger | Debug |
|---|---|---|---|---|---|
| development | root/app `.env` files | local/dev PostgreSQL | local only | optional | allowed |
| staging | CI/CD environment + secret manager | isolated staging PostgreSQL | secret manager | optional/authenticated | restricted |
| production | deployment environment + secret manager | managed PostgreSQL/PITR | secret manager/KMS | disabled by default | disabled |

Never commit `.env`, database credentials, JWT secrets, API keys, payment secrets, or PHI.

The same variable names are used across environments; only values change. Module-specific variables live in `apps/api/.env` and `apps/web/.env`, while shared database/secret values can be supplied at the deployment environment level.
