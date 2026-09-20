# ClinicCare regenerated build baseline

This package aligns the repository around:

- Node.js 24.21.0
- npm 11.x
- Prisma 7.10.0
- NestJS 12.0.3
- Next.js 16.3.3
- React 19.2.x
- TypeScript 7.0.2

## Important architecture rule

`apps/web` must not import Prisma or any file under `apps/api/src/generated/prisma`.
The Web application calls the NestJS API over HTTP.

## Clean installation

```powershell
node -v
npm -v
npm ci
npm run db:generate
npm run prisma:validate
npm run typecheck:api
npm run typecheck:web
npm run build:api
npm run build:web
```

If there is no root package-lock.json yet, run `npm install` once with Node 24.21.0, commit the generated lockfile, and thereafter use `npm ci`.
