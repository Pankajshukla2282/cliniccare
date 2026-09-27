import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'apps/auth/prisma/schema.prisma',
  migrations: {
    path: 'apps/auth/prisma/migrations',
    seed: 'tsx apps/auth/prisma/seed.ts'
  },
  datasource: {
    url: env('DATABASE_URL')
  }
});