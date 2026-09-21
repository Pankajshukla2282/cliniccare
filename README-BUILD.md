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


### npm dependency installation

ClinicCare builds require the TypeScript/Prisma toolchain. The API keeps its bcryptjs and Express type declarations in the API dependency set so `npm run typecheck:api` remains reliable even if a machine has `npm config omit=dev` configured. Prefer normal installs with development dependencies available for the full build:

```powershell
npm config delete omit
npm ci
```

If you intentionally keep `omit=dev`, use `npm ci --include=dev` for build/test work.


## Kubernetes namespace validation

The development launcher derives the namespace from `APP_ENV`: development → `cliniccare-development`, staging → `cliniccare-staging`, production → `cliniccare-production`. To deploy the development stack before using `DEV_INFRA_MODE=k8s`:

```powershell
kubectl kustomize .\infrastructure\k8s\overlays\development --load-restrictor LoadRestrictionsNone | kubectl apply -f -
kubectl get namespace cliniccare-development
kubectl get svc -n cliniccare-development
```

For local development without Kubernetes, use `DEV_INFRA_MODE=local`.
