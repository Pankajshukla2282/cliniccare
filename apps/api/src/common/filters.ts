import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = req.header('x-request-id') ?? undefined;
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = typeof raw === 'object' && raw && 'message' in raw ? (raw as {message: unknown}).message : (raw ?? 'Internal server error');
    const errorCode = status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`;
    if (status >= 500) console.error('[API] unhandled request error', exception);
    res.status(status).json({ statusCode: status, errorCode, message, requestId, timestamp: new Date().toISOString(), path: req.originalUrl });
  }
}
