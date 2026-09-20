# Disaster recovery

1. Use managed PostgreSQL PITR and daily backups; retain according to organizational/legal policy.
2. Test restore at least quarterly in an isolated environment.
3. Restore database, deploy the exact application artifact, run `npm run prisma:validate`, then `npm run db:migrate:deploy`.
4. Verify `/healthz` and `/readyz`, then execute smoke workflows.
5. Never restore production PHI into developer environments.
