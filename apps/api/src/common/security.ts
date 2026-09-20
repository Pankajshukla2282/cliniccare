import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';

export function requestId(req: Request): string {
  const incoming = req.header('x-request-id')?.trim();
  return incoming && /^[A-Za-z0-9._:-]{8,128}$/.test(incoming) ? incoming : createHash('sha256')
    .update(`${Date.now()}:${Math.random()}`)
    .digest('hex').slice(0, 24);
}

export function isSafeMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export function assertAllowedOrigin(req: Request, allowedOrigins: string[]): boolean {
  const origin = req.header('origin');
  if (!origin || allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

export function applySecurityResponseHeaders(res: Response, requestIdValue: string, noStore = true): void {
  res.setHeader('X-Request-Id', requestIdValue);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (noStore) res.setHeader('Cache-Control', 'no-store');
}
