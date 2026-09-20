# ClinicCare production baseline

This release targets the following production baseline:

| Component | Baseline |
|---|---|
| Node.js | 24.21.0 LTS |
| npm | 11.x (11.19.1 is the documented CI baseline) |
| Next.js | 16.3.3 |
| React | 19.2.x |
| React DOM | 19.2.x |
| NestJS | 12.x |
| TypeScript | 7.x (7.0.2 manifest baseline) |
| Prisma | 7.x (7.10.0 manifest baseline) |
| PostgreSQL | 18.6 |
| Redis | 8.2.10 (Redis 8.2 extended-support line) |
| ESLint | 9.x (9.39.5 manifest baseline) |
| Docker Node image | node:24.21.0-bookworm-slim |

## Dependency lockfile

The source package was updated to the requested manifests, but the execution environment used to prepare this archive has no DNS/network access to the npm registry. Therefore the existing `package-lock.json` could not safely be regenerated without inventing dependency resolutions.

**Before the first CI/build from this archive, regenerate the lockfile using npm 11:**

```bash
nvm install 24.21.0
nvm use 24.21.0
npm --version
npm install
npm run baseline:verify
npm audit --audit-level=high
```

Commit the resulting `package-lock.json`. Production CI and Docker builds should then use `npm ci`.

Do not use `npm install` during production image builds once the regenerated lockfile is committed.
