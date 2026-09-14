import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';
import { TenantThemeProvider } from '@/components/tenant-theme-provider';
import { getTenantBySubdomain } from '@/lib/tenant-data';
import type { TenantThemeSettings } from '@/lib/tenant-theme';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export async function generateMetadata(): Promise<Metadata> {
  const subdomain = headers().get('x-tenant-subdomain');
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  if (!tenant) {
    return {
      title: 'ClinicCare Platform',
      description:
        'Digital clinic platform for consultations, EECP therapy, skin care, and doctor-recommended products.',
    };
  }
  return {
    title: `${tenant.name} · ClinicCare`,
    description: `${tenant.name} — digital clinic operations on the ClinicCare platform.`,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const subdomain = headers().get('x-tenant-subdomain');
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  const settings = (tenant?.settings as TenantThemeSettings | undefined) ?? null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TenantThemeProvider settings={tenant ? settings : null}>{children}</TenantThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}