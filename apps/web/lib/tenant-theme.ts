import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Maps an `Organization.settings` JSON payload onto CSS custom properties.
 * Each key is expressed as an HSL triplet `"H S% L%"`, mirroring the tokens
 * declared in globals.css so tenant branding overrides the design system.
 *
 * Supported keys (subset now, extensible later):
 *   brand.primary          -> --brand
 *   brand.primaryForeground -> --brand-foreground
 *   brand.background       -> --brand-background
 *   radius                 -> --radius (px)
 */
export type TenantThemeSettings = {
  brand?: {
    primary?: string;
    primaryForeground?: string;
    background?: string;
  };
  radius?: number;
};

export function tenantThemeVars(settings?: TenantThemeSettings | null): Record<string, string> {
  if (!settings) return {};
  const vars: Record<string, string> = {};
  const brand = settings.brand;
  if (brand?.primary) {
    vars['--brand'] = brand.primary;
    // Feed the design system so every shadcn/ui component adopts the brand.
    vars['--primary'] = brand.primary;
  }
  if (brand?.primaryForeground) {
    vars['--brand-foreground'] = brand.primaryForeground;
    vars['--primary-foreground'] = brand.primaryForeground;
  }
  if (brand?.background) vars['--brand-background'] = brand.background;
  if (typeof settings.radius === 'number') vars['--radius'] = `${settings.radius}px`;
  return vars;
}