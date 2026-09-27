FROM node:24.21.0-bookworm-slim AS deps
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/auth/package.json ./apps/auth/
RUN npm ci --no-audit --no-fund --omit=dev

FROM node:24.21.0-bookworm-slim AS build
WORKDIR /srv
COPY package.json package-lock.json ./
COPY apps/auth/package.json ./apps/auth/
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci --no-audit --no-fund
COPY apps/auth/tsconfig*.json ./apps/auth/
COPY apps/auth/src ./apps/auth/src/
WORKDIR /srv/apps/auth
RUN npx prisma generate --schema ../../prisma/schema.prisma
RUN npm run build

FROM node:24.21.0-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /srv

COPY --from=deps /srv/node_modules ./node_modules
COPY --from=build /srv/package.json ./
COPY --from=build /srv/prisma.config.ts ./
COPY --from=build /srv/prisma ./prisma
COPY --from=build /srv/apps/auth/package.json ./apps/auth/package.json
COPY --from=build /srv/apps/auth/dist ./apps/auth/dist

ARG PRISMA_CLI_VERSION=7.10.0
RUN npm install --no-audit --no-fund --global prisma@${PRISMA_CLI_VERSION}

RUN groupadd --system app && useradd --system --gid app --home-dir /srv app && chown -R app:app /srv
USER app

RUN mkdir -p /srv/logs

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/healthz').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))" 

CMD ["node", "apps/auth/dist/main.js"]