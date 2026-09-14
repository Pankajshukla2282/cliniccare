# Kubernetes manifests — ClinicCare Platform

No Docker Compose in this repo. All environments (including local dev on
docker-desktop) deploy to Kubernetes.

## Why manifests live here

They were briefly at the repo root (`cluster.yaml`, …) by mistake during
scaffolding. Root-level loose YAMLs don't scope, order, or version
environments. The canonical location is:

```
cliniccare/infrastructure/k8s/
```

with numbered files for apply order plus a `kustomization.yaml`.

## Deploy (docker-desktop)

```powershell
# 1. Infra only — uses public images, pods should reach Running:
kubectl apply -f cliniccare/infrastructure/k8s/00-namespace.yaml
kubectl apply -f cliniccare/infrastructure/k8s/10-postgres.yaml
kubectl apply -f cliniccare/infrastructure/k8s/11-redis.yaml
kubectl get pods -n cliniccare

# 2. Everything (api/web stay pending until Step 3 builds their images):
kubectl apply -k cliniccare/infrastructure/k8s/
kubectl get pods -n cliniccare
```

Expected before Step 3: `postgres` and `redis` Running; `api` and `web`
will show `ImagePullBackOff`/`ErrImagePull` because `cliniccare/api:dev`
and `cliniccare/web:dev` are only built once the NestJS/Next.js apps
and Dockerfiles exist. That is intentional — infra first, apps second.

## Secrets

`api-secrets` and `postgres-credentials` use `stringData` placeholders
(`CHANGE_ME`). Replace with real values via an external secret manager
before any shared/staging environment.
