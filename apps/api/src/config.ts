import 'dotenv/config';

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function listEnv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  return raw === undefined ? fallback : raw.split(',').map((v) => v.trim()).filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const jwtSecret = process.env.JWT_SECRET?.trim() ?? '';
const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';

if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (isProduction && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be configured and at least 32 characters in production');
}

export const apiConfig = {
  nodeEnv,
  isProduction,
  host: process.env.API_HOST ?? process.env.HOST ?? '127.0.0.1',
  port: numberEnv('API_PORT', numberEnv('PORT', 3100)),
  basePath: (process.env.API_BASE_PATH ?? '/api/v1').replace(/^\/?/, '/').replace(/\/$/, ''),
  webOrigin: listEnv('WEB_ORIGIN', ['http://localhost:3000']),
  corsAllowCredentials: (process.env.CORS_ALLOW_CREDENTIALS ?? 'true').toLowerCase() === 'true',
  databaseUrl,
  logDir: process.env.LOG_DIR ?? 'logs',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  jwtSecret: jwtSecret || 'development-only-cliniccare-jwt-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTtlDays: numberEnv('REFRESH_TOKEN_TTL_DAYS', 7),
  bcryptSaltRounds: Math.max(12, numberEnv('BCRYPT_SALT_ROUNDS', 12)),
  passwordMinLength: Math.max(8, numberEnv('PASSWORD_MIN_LENGTH', 12)),
  rateLimitTtlMs: numberEnv('RATE_LIMIT_TTL_MS', 60_000),
  rateLimitMax: numberEnv('RATE_LIMIT_MAX', 120),
  authRateLimitMax: numberEnv('AUTH_RATE_LIMIT_MAX', 10),
  bodyLimit: process.env.API_BODY_LIMIT ?? '1mb',
  enableSwagger: (process.env.ENABLE_SWAGGER ?? 'false').toLowerCase() === 'true',
  swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
  csrfEnabled: (process.env.CSRF_ENABLED ?? (isProduction ? 'true' : 'false')).toLowerCase() === 'true',
  csrfAllowedOrigins: listEnv('CSRF_ALLOWED_ORIGINS', listEnv('WEB_ORIGIN', ['http://localhost:3000'])),
  phiNoStore: (process.env.PHI_NO_STORE ?? 'true').toLowerCase() === 'true',
  idempotencyTtlMinutes: numberEnv('IDEMPOTENCY_TTL_MINUTES', 30),
  apiVersion: process.env.API_VERSION ?? '1',
} as const;
