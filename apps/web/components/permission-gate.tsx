'use client';

import type { ReactNode } from 'react';
import { hasPermission, type Permission } from '@/lib/permissions';

export function PermissionGate({ permissions, required, children, fallback = null }: { permissions?: string[]; required: Permission | Permission[]; children: ReactNode; fallback?: ReactNode }) {
  return hasPermission(permissions, required) ? <>{children}</> : <>{fallback}</>;
}
