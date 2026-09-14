import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const TENANT_KEY = 'tenant';
export const Tenant = () => SetMetadata(TENANT_KEY, true);

export interface RequestUser {
  sub: number;
  email: string;
  role: string;
  permissions: string[];
  organizationId: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as RequestUser;
  },
);

export const OrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;
    if (!user?.organizationId) throw new Error('No organization context');
    return user.organizationId;
  },
);
