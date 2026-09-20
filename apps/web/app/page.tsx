import { webConfig } from '@/lib/config';

import { getTenant } from '../lib/api';

export default async function HomePage() {
  const tenant = await getTenant(webConfig.defaultTenantSlug);
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">ClinicCare</p>
        <h1 className="mt-2 text-3xl font-bold">{tenant?.name ?? 'ClinicCare'}</h1>
        <p className="mt-3 text-slate-600">Healthcare platform web application.</p>
        {!tenant && <p className="mt-4 text-sm text-amber-700">API tenant data is unavailable. Start the API or configure NEXT_PUBLIC_API_URL.</p>}
      </section>
    </main>
  );
}
