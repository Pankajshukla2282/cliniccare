import { CallHandler, ConflictException, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IDEMPOTENCY_KEY } from './decorators';
import { apiConfig } from '../config';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const required = this.reflector.getAllAndOverride<boolean>(IDEMPOTENCY_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return next.handle();
    const req = context.switchToHttp().getRequest<Request & { user?: { sub?: number; organizationId?: number } }>();
    const key = req.header('idempotency-key')?.trim();
    if (!key || !/^[A-Za-z0-9._:-]{16,128}$/.test(key)) throw new ConflictException('A valid Idempotency-Key header is required');
    const orgId = req.user?.organizationId ?? null;
    const userId = req.user?.sub ?? null;
    const method = req.method; const path = req.originalUrl;
    return from(this.reserve(orgId, userId, key, method, path)).pipe(
      switchMap(() => next.handle()),
      tap({ next: () => void this.mark(orgId, key, 200), error: () => void this.release(orgId, key) }),
    );
  }
  private async reserve(organizationId:number|null,userId:number|null,key:string,method:string,path:string){
    await this.prisma.idempotencyKey.deleteMany({where:{expiresAt:{lt:new Date()}}});
    try {
      await this.prisma.idempotencyKey.create({data:{organizationId,userId,key,method,path,expiresAt:new Date(Date.now()+apiConfig.idempotencyTtlMinutes*60_000)}});
    } catch { throw new ConflictException('Duplicate Idempotency-Key'); }
  }
  private async mark(organizationId:number|null,key:string,statusCode:number){await this.prisma.idempotencyKey.updateMany({where:{organizationId,key},data:{statusCode}}).catch(()=>undefined);}
  private async release(organizationId:number|null,key:string){await this.prisma.idempotencyKey.deleteMany({where:{organizationId,key,statusCode:null}}).catch(()=>undefined);}
}
