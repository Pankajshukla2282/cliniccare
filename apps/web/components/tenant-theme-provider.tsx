'use client';

import * as React from 'react';

import { tenantThemeVars, type TenantThemeSettings } from '@/lib/tenant-theme';

/**
 * Applies tenant branding from Organization.settings onto the document root as
 * CSS custom properties. Inline styles win over the default tokens in
 * globals.css, so each tenant can own its colors without touching the design
 * system. Feeds `--brand*` and `data-tenant` for downstream feature flags.
 */
export function TenantThemeProvider({
  settings,
  children,
}: {
  settings?: TenantThemeSettings | null;
  children: React.ReactNode;
}) {
  const vars = tenantThemeVars(settings);
  const hasBrand = Boolean(settings?.brand);
  return (
    <div
      data-tenant={hasBrand ? 'true' : undefined}
      style={vars as React.CSSProperties}
      className="min-h-dvh"
    >
      {children}
    </div>
  );
}