# ClinicCare API — build context: cliniccare/ repo root
# docker build -f apps/api/Dockerfile -t cliniccare/api:dev .
FROM node:20-alpine AS build
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY prisma ./prisma/
RUN npm ci --no-audit --no-fund --workspace @cliniccare/api --include-workspace-root=false 2>/dev/null \
  || npm install --no-audit --no-fund --workspace @cliniccare/api
COPY apps/api/tsconfig*.json ./apps/api/
COPY apps/api/src ./apps/api/src/
WORKDIR /srv/apps/api
RUN npx prisma generate --schema ../../prisma/schema.prisma
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /srv/apps/api
COPY --from=build /srv/apps/api/dist ./dist
COPY --from=build /srv/apps/api/node_modules ./node_modules
COPY --from=build /srv/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
