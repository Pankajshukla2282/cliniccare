import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const REFLECTOR = 'reflector';

export function CurrentUser() {
  return createParamDecorator((data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  });
}

export function Public() {
  return SetMetadata('isPublic', true);
}

export type RequestUser = {
  sub: number;
  email: string;
  role: string;
  permissions?: string[];
  organizationId?: number;
  clinicId?: number;
};