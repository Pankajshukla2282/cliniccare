import './globals.css';
import type { Metadata } from 'next';
import { TenantBanner } from '@/components/tenant-banner';

export const metadata: Metadata = {
  title: 'ClinicCare',
  description: 'ClinicCare healthcare platform'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header className="border-b px-6 py-3"><div className="mx-auto flex max-w-5xl items-center justify-between"><span className="font-semibold">ClinicCare</span><TenantBanner /></div></header>{children}</body></html>;
}
