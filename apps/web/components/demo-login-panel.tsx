'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100').replace(/\/$/, '');
const apiBasePath = (process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1').replace(/^\/?/, '/').replace(/\/$/, '');

const demoAccounts = [
  { label: 'Admin', email: 'admin@cliniccare.local', password: 'ChangeMe123!' },
  { label: 'Aarogyam admin', email: 'admin+cliniccare-demo-wellness@cliniccare.local', password: 'ChangeMe123!' },
  { label: 'Clinic admin', email: 'clinic-admin+cliniccare-demo@cliniccare.local', password: 'Staff123!' },
  { label: 'Doctor', email: 'doctor+cliniccare-demo@cliniccare.local', password: 'Doctor123!' },
  { label: 'Reception', email: 'reception+cliniccare-demo@cliniccare.local', password: 'Reception123!' },
  { label: 'Nurse', email: 'nurse+cliniccare-demo@cliniccare.local', password: 'Staff123!' },
  { label: 'Pharmacist', email: 'pharmacist+cliniccare-demo@cliniccare.local', password: 'Staff123!' },
  { label: 'Accountant', email: 'accountant+cliniccare-demo@cliniccare.local', password: 'Staff123!' },
  { label: 'Content', email: 'content+cliniccare-demo@cliniccare.local', password: 'Staff123!' },
  { label: 'Patient', email: 'patient+cliniccare-demo@cliniccare.local', password: 'Patient123!' },
  { label: 'Aarogyam doctor', email: 'doctor+cliniccare-demo-wellness@cliniccare.local', password: 'Doctor123!' },
  { label: 'Aarogyam reception', email: 'reception+cliniccare-demo-wellness@cliniccare.local', password: 'Reception123!' },
  { label: 'Aarogyam nurse', email: 'nurse+cliniccare-demo-wellness@cliniccare.local', password: 'Staff123!' },
  { label: 'Aarogyam pharmacist', email: 'pharmacist+cliniccare-demo-wellness@cliniccare.local', password: 'Staff123!' },
  { label: 'Aarogyam accountant', email: 'accountant+cliniccare-demo-wellness@cliniccare.local', password: 'Staff123!' },
  { label: 'Aarogyam content', email: 'content+cliniccare-demo-wellness@cliniccare.local', password: 'Staff123!' },
  { label: 'Aarogyam patient', email: 'patient+cliniccare-demo-wellness@cliniccare.local', password: 'Patient123!' },
];

export function DemoLoginPanel() {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  function chooseAccount(account: (typeof demoAccounts)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setStatus(`${account.label} account selected`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus('Signing in...');
    try {
      const response = await fetch(`${apiUrl}${apiBasePath}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Login failed');
      localStorage.setItem('cliniccare.accessToken', payload.accessToken);
      localStorage.setItem('cliniccare.session', JSON.stringify({ user: payload.user, permissions: payload.permissions ?? [] }));
      setStatus(`Signed in as ${payload.user.role}. Opening workspace...`);
      router.push('/dashboard');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 md:grid-cols-[1fr_1.2fr] md:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand))]">RBAC sandbox</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">Sign in to the clinic workspace</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Use a demo role to explore the permissions and tenant-scoped workflows.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {demoAccounts.map((account) => (
            <Button key={account.label} type="button" variant="outline" size="sm" onClick={() => chooseAccount(account)}>
              {account.label}
            </Button>
          ))}
        </div>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-[hsl(var(--brand))] focus:ring-2" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-[hsl(var(--brand))] focus:ring-2" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        <Button className="w-full" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</Button>
        <p className="min-h-5 text-sm text-slate-600" aria-live="polite">{status}</p>
      </form>
    </section>
  );
}
