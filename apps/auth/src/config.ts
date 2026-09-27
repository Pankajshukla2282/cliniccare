// Config for auth service
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TTL_DAYS: z.coerce.number().default('30'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default('10'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default('10'),
  AUTH_RATE_LIMIT_TTL_MS: z.coerce.number().default('60000'),
  PASSWORD_MIN_LENGTH: z.coerce.number().default('8'),
  TENANT_DEFAULT_PLAN: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).default('STARTER'),
  TENANT_TRIAL_DAYS: z.coerce.number().default('14'),
});

type Config = z.infer<typeof envSchema>;
export const apiConfig = envSchema.parse(process.env) as Config;