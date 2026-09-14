# ClinicCare Web — build context: cliniccare/ repo root
# docker build -f apps/web/Dockerfile -t cliniccare/web:dev .
FROM node:20-alpine AS deps
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
RUN npm ci --no-audit --no-fund --workspace @cliniccare/web --include-workspace-root=false 2>/dev/null \
  || npm install --no-audit --no-fund --workspace @cliniccare/web

FROM node:20-alpine AS build
WORKDIR /srv
COPY --from=deps /srv/node_modules ./node_modules
COPY package.json ./
COPY apps/web ./apps/web/
WORKDIR /srv/apps/web
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /srv/apps/web
COPY --from=build /srv/apps/web/.next/standalone ./
COPY --from=build /srv/apps/web/.next/static ./.next/static
COPY --from=build /srv/apps/web/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
