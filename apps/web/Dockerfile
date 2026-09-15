# ClinicCare Web — build context: cliniccare/ repo root
# docker build -f apps/web/Dockerfile -t cliniccare/web:dev .
# Next.js `output: standalone` image; non-root + healthcheck. The web app
# imports the Prisma client generated into apps/api/src/generated, so this
# build generates it before `next build` (same steps as the API build).

# Runtime dependencies only.
FROM node:20-alpine AS deps
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
RUN npm ci --no-audit --no-fund --omit=dev

# Full install (Prisma CLI included) to generate the client + build.
FROM node:20-alpine AS build
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci --no-audit --no-fund
COPY apps/web ./apps/web/
WORKDIR /srv/apps/web
RUN npx prisma generate --schema ../../prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
# Standalone output mirrors the monorepo layout (build root is /srv):
# server.js lives at apps/web/server.js.
WORKDIR /srv
COPY --from=build /srv/apps/web/.next/standalone ./
COPY --from=build /srv/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /srv/apps/web/public ./apps/web/public

# Run as an unprivileged user.
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /srv
USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "apps/web/server.js"]