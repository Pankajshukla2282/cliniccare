import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { apiConfig } from '../config';
import { applySecurityResponseHeaders, assertAllowedOrigin, isSafeMethod, requestId } from './security';

@Injectable()
export class RequestSecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id = requestId(req);
    req.headers['x-request-id'] = id;
    applySecurityResponseHeaders(res, id, apiConfig.phiNoStore);
    if (apiConfig.csrfEnabled && !isSafeMethod(req.method) && !assertAllowedOrigin(req, apiConfig.csrfAllowedOrigins)) {
      res.status(403).json({ statusCode: 403, errorCode: 'CSRF_ORIGIN_REJECTED', message: 'Request origin is not allowed', requestId: id });
      return;
    }
    next();
  }
}
