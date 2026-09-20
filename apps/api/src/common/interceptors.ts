import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

const SENSITIVE = new Set(['passwordHash', 'tokenHash', 'password', 'secret', 'authorization']);
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date || Object.getPrototypeOf(value) !== Object.prototype) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) out[key] = SENSITIVE.has(key) ? '[REDACTED]' : sanitize(child);
  return out;
}

@Injectable()
export class OutputSanitizationInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => sanitize(data)));
  }
}

@Injectable()
export class AuditRequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: { sub?: number; organizationId?: number } }>();
    // Deliberately record metadata only. Request/response bodies may contain PHI and are never logged here.
    const original = req.headers['x-request-id'];
    if (original) req.headers['x-request-id'] = String(original);
    return next.handle();
  }
}
