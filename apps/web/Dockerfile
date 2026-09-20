# ClinicCare Web — build context: cliniccare/ repo root
FROM node:24.21.0-bookworm-slim AS build
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci --no-audit --no-fund --omit=dev

COPY apps/web ./apps/web/
ARG NEXT_PUBLIC_API_URL=http://localhost:3100
ARG NEXT_PUBLIC_API_BASE_PATH=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_BASE_PATH=$NEXT_PUBLIC_API_BASE_PATH
WORKDIR /srv/apps/web
RUN npm run build

FROM node:24.21.0-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /srv
COPY --from=build /srv/apps/web/.next/standalone ./
COPY --from=build /srv/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /srv/apps/web/public ./apps/web/public
RUN groupadd --system app && useradd --system --gid app --home-dir /srv app && chown -R app:app /srv
USER app
RUN mkdir -p /srv/logs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
