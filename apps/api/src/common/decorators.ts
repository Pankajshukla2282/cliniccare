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
  clinicId?: number | null;
  tenantSlug?: string;
  environment?: string;
  roles?: string[];
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


export const IDEMPOTENCY_KEY = 'idempotency-required';
export const RequireIdempotency = () => SetMetadata(IDEMPOTENCY_KEY, true);

export const PURPOSE_KEY = 'purpose-of-use';
export const PurposeOfUse = (purpose: string) => SetMetadata(PURPOSE_KEY, purpose);
