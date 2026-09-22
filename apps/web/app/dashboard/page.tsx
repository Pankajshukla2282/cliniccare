'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100').replace(/\/$/, '');
const apiBasePath = (process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1').replace(/^\/?/, '/').replace(/\/$/, '');

type ModuleKey = 'overview' | 'patients' | 'appointments' | 'clinical' | 'catalog' | 'operations';
type User = { id: number; email: string; firstName: string; lastName: string; role: string; organizationId: number };
type DashboardData = Record<string, unknown>;

const modules: Array<{ key: ModuleKey; label: string; permission?: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'patients', label: 'Patients', permission: 'patient.read' },
  { key: 'appointments', label: 'Appointments', permission: 'appointment.read' },
  { key: 'clinical', label: 'Clinical', permission: 'medical_record.read' },
  { key: 'catalog', label: 'Catalog', permission: 'service.read' },
  { key: 'operations', label: 'Operations' },
];

async function readJson(path: string, token: string, tenantSlug: string) {
  const response = await fetch(`${apiUrl}${apiBasePath}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenantSlug, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

function listValue(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
}

function rowLabel(row: Record<string, unknown>, index: number): string {
  const patient = row.patient as Record<string, unknown> | undefined;
  const patientUser = patient?.user as Record<string, unknown> | undefined;
  return String(row.name ?? row.title ?? patientUser?.firstName ?? row.email ?? `Record ${index + 1}`);
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [tenantSlug, setTenantSlug] = useState('cliniccare-demo');
  const [activeModule, setActiveModule] = useState<ModuleKey>('overview');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const permissions = useMemo(() => new Set((data.permissions as string[] | undefined) ?? []), [data.permissions]);
  const visibleModules = modules.filter((module) => !module.permission || permissions.has('*') || permissions.has(module.permission));

  useEffect(() => {
    const savedToken = localStorage.getItem('cliniccare.accessToken');
    if (!savedToken) {
      router.replace('/');
      return;
    }
    setToken(savedToken);
    const session = localStorage.getItem('cliniccare.session');
    if (session) {
      try {
        const parsed = JSON.parse(session) as { permissions?: string[] };
        setData((current) => ({ ...current, permissions: parsed.permissions ?? [] }));
      } catch {
        localStorage.removeItem('cliniccare.session');
      }
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.allSettled([
      readJson('/auth/me', token, tenantSlug),
      readJson('/reports/dashboard', token, tenantSlug),
      readJson('/patients?take=20', token, tenantSlug),
      readJson('/appointments', token, tenantSlug),
      readJson('/services', token, tenantSlug),
      readJson('/products', token, tenantSlug),
      readJson('/clinics', token, tenantSlug),
    ]).then((results) => {
      if (cancelled) return;
      const keys = ['user', 'report', 'patients', 'appointments', 'services', 'products', 'clinics'];
      const next: Record<string, unknown> = { permissions: [] };
      const nextAvailable: Record<string, boolean> = {};
      results.forEach((result, index) => {
        const key = keys[index];
        if (result.status === 'fulfilled') {
          next[key] = result.value;
          nextAvailable[key] = true;
        } else {
          nextAvailable[key] = false;
        }
      });
      const currentUser = next.user as User | undefined;
      if (!currentUser) {
        localStorage.removeItem('cliniccare.accessToken');
        router.replace('/');
        return;
      }
      const session = localStorage.getItem('cliniccare.session');
      let sessionPermissions: string[] = [];
      if (session) {
        try { sessionPermissions = (JSON.parse(session) as { permissions?: string[] }).permissions ?? []; } catch { sessionPermissions = []; }
      }
      next.permissions = sessionPermissions;
      setUser(currentUser);
      setData(next);
      setAvailable(nextAvailable);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [router, tenantSlug, token]);

  function logout() {
    localStorage.removeItem('cliniccare.accessToken');
    localStorage.removeItem('cliniccare.session');
    router.replace('/');
  }

  const patients = listValue(data.patients);
  const appointments = listValue(data.appointments);
  const services = listValue(data.services);
  const products = listValue(data.products);
  const clinics = listValue(data.clinics);
  const report = data.report as Record<string, unknown> | undefined;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand))]">ClinicCare</p>
            <p className="mt-2 font-semibold text-slate-950">{user ? `${user.firstName} ${user.lastName}` : 'Workspace'}</p>
            <p className="text-xs text-slate-500">{user?.role ?? 'Loading role...'}</p>
          </div>
          <nav className="mt-4 space-y-1">
            {visibleModules.map((module) => <button key={module.key} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${activeModule === module.key ? 'bg-[hsl(var(--brand))] text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveModule(module.key)}>{module.label}</button>)}
          </nav>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <label className="text-xs font-medium text-slate-500">Tenant scope</label>
            <select className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)}>
              <option value="cliniccare-demo">ClinicCare Demo</option>
              <option value="cliniccare-demo-wellness">Aarogyam Wellness</option>
            </select>
            <Button className="mt-4 w-full" variant="outline" size="sm" onClick={logout}>Sign out</Button>
          </div>
        </aside>

        <section>
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm text-slate-500">Tenant workspace</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">{tenantSlug === 'cliniccare-demo' ? 'ClinicCare Demo' : 'Aarogyam Skin & Wellness'}</h1></div>
            <div className="text-sm text-slate-500">{user?.email}</div>
          </header>
          {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">Loading workspace data...</div>}
          {!loading && error && <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>}
          {!loading && !error && <WorkspaceContent module={activeModule} report={report} patients={patients} appointments={appointments} services={services} products={products} clinics={clinics} available={available} />}
        </section>
      </div>
    </main>
  );
}

function WorkspaceContent({ module, report, patients, appointments, services, products, clinics, available }: { module: ModuleKey; report?: Record<string, unknown>; patients: Array<Record<string, unknown>>; appointments: Array<Record<string, unknown>>; services: Array<Record<string, unknown>>; products: Array<Record<string, unknown>>; clinics: Array<Record<string, unknown>>; available: Record<string, boolean> }) {
  if (module === 'overview') return <Overview report={report} patients={patients} appointments={appointments} clinics={clinics} />;
  const titles: Record<Exclude<ModuleKey, 'overview'>, string> = { patients: 'Patients', appointments: 'Appointments', clinical: 'Clinical workspace', catalog: 'Services and products', operations: 'Operations' };
  const rows = module === 'patients' ? patients : module === 'appointments' ? appointments : module === 'catalog' ? [...services, ...products] : module === 'clinical' ? patients : clinics;
  const source = module === 'patients' ? 'patients' : module === 'appointments' ? 'appointments' : module === 'catalog' ? (available.services ? 'services' : 'products') : module === 'clinical' ? 'patients' : 'clinics';
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">RBAC-enabled module</p><h2 className="text-2xl font-semibold text-slate-950">{titles[module]}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{rows.length} records</span></div><div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Scope</th></tr></thead><tbody>{rows.slice(0, 20).map((row, index) => <tr key={String(row.id ?? index)} className="border-b last:border-0"><td className="py-3 pr-4 font-medium text-slate-800">{rowLabel(row, index)}</td><td className="py-3 pr-4 text-slate-600">{String(row.status ?? row.type ?? 'ACTIVE')}</td><td className="py-3 text-slate-500">{source}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No records are available for this role or tenant.</p>}</div></section>;
}

function Overview({ report, patients, appointments, clinics }: { report?: Record<string, unknown>; patients: Array<Record<string, unknown>>; appointments: Array<Record<string, unknown>>; clinics: Array<Record<string, unknown>> }) {
  const cards = [['Patients', patients.length], ['Appointments', appointments.length], ['Clinics', clinics.length], ['Report metrics', report ? Object.keys(report).length : 0]];
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-slate-950">{value}</p></div>)}</div><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--brand))]">Workflow guide</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">Your role controls what appears here</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Switch roles from the home page to compare patient care, reception, product, content, billing, and administrative views. Switch tenants only when your membership grants access.</p></section></div>;
}
