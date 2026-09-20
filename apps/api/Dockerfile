# ClinicCare API — build context: cliniccare/ repo root
# docker build -f apps/api/Dockerfile -t cliniccare/api:dev .
# Runtime image is hardened: non-root, read-only code, healthcheck, and ships
# the Prisma CLI + migration history so a pod can run `prisma migrate deploy`
# (see the migrate initContainer in 20-api.yaml).

# Runtime dependencies only (no dev tooling): pruned install in its own stage.
FROM node:24.21.0-bookworm-slim AS deps
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --no-audit --no-fund --omit=dev

# Full install (dev deps included) to build + generate the Prisma client.
FROM node:24.21.0-bookworm-slim AS build
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci --no-audit --no-fund
COPY apps/api/tsconfig*.json ./apps/api/
COPY apps/api/src ./apps/api/src/
WORKDIR /srv/apps/api
RUN npx prisma generate --schema ../../prisma/schema.prisma
RUN npm run build

FROM node:24.21.0-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /srv

COPY --from=deps /srv/node_modules ./node_modules

COPY --from=build /srv/package.json ./
COPY --from=build /srv/prisma.config.ts ./
COPY --from=build /srv/prisma ./prisma
COPY --from=build /srv/apps/api/package.json ./apps/api/package.json
COPY --from=build /srv/apps/api/dist ./apps/api/dist

# Prisma CLI needed for `npx prisma migrate deploy` (it lives at the repo root
# as a dev dependency, so bundle a pinned copy for the runtime image).
# Pin to the same version the lockfile resolves (see package.json).
ARG PRISMA_CLI_VERSION=7.10.0
RUN npm install --no-audit --no-fund --global prisma@${PRISMA_CLI_VERSION}

# Run as an unprivileged user.
RUN groupadd --system app && useradd --system --gid app --home-dir /srv app && chown -R app:app /srv
USER app

RUN mkdir -p /srv/logs

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))" 

CMD ["node", "apps/api/dist/main.js"]