import { webConfig } from '@/lib/config';
import { DemoLoginPanel } from '@/components/demo-login-panel';

import { getTenant } from '../lib/api';

export default async function HomePage() {
  const tenant = await getTenant(webConfig.defaultTenantSlug);
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <section className="mb-8 border-l-4 border-[hsl(var(--brand))] pl-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">ClinicCare workspace</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{tenant?.name ?? 'ClinicCare'}</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Tenant: {tenant?.slug ?? webConfig.defaultTenantSlug}. Choose a role below to explore the seeded clinic workflows.</p>
        {!tenant && <p className="mt-4 text-sm text-amber-700">API tenant data is unavailable. Start the API or configure NEXT_PUBLIC_API_URL.</p>}
      </section>
      <DemoLoginPanel />
    </main>
  );
}
