import { HeartPulse, Stethoscope, Sparkles, Syringe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TenantBanner } from '@/components/tenant-banner';
import { ThemeToggle } from '@/components/theme-toggle';

const services = [
  {
    icon: Stethoscope,
    title: 'Teleconsultation',
    description: 'Book and manage doctor consultations with secure clinical records.',
  },
  {
    icon: HeartPulse,
    title: 'EECP Therapy',
    description: 'Non-invasive cardiac treatment programs with treatment plan tracking.',
  },
  {
    icon: Sparkles,
    title: 'Skin Care',
    description: 'Skin analysis, plans, and follow-ups for dermatology patients.',
  },
  {
    icon: Syringe,
    title: 'Pharmacy & Shop',
    description: 'Doctor-recommended products, packages, coupons, and order fulfillment.',
  },
];

import { headers } from 'next/headers';

import { getTenantBySubdomain } from '@/lib/tenant-data';

export default async function Home() {
  const subdomain = headers().get('x-tenant-subdomain');
  const tenant = subdomain ? await getTenantBySubdomain(subdomain) : null;
  const brand = tenant?.name ? `${tenant.name} — ` : '';

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            <span className="font-semibold">{tenant?.name ?? 'ClinicCare Platform'}</span>
            <TenantBanner />
            <Badge variant="secondary" className="hidden md:inline-flex">
              SaaS
            </Badge>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center">
        <Badge className="mb-4">{tenant ? `Welcome to ${tenant.name}` : 'Multi-tenant foundation ready'}</Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {tenant ? `${tenant.name} — digital clinic operations, on one platform` : 'Digital clinic operations, on one platform'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {tenant
            ? `${brand}consultations, EECP therapy, dermatology, and doctor-recommended products — built on the ClinicCare platform.`
            : 'Consultations, EECP therapy, dermatology, and doctor-recommended products — with org-scoped isolation, tenant on-boarding, and a pluggable design system.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <a href="/docs">Explore the API</a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="mailto:hello@cliniccare.example">Talk to sales</a>
          </Button>
        </div>
      </section>

      <Separator />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold">Everything a clinic needs</h2>
        <p className="mt-1 text-muted-foreground">One tenant per clinic — isolated by design.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="transition-colors hover:border-primary/50">
              <CardHeader>
                <Icon className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} ClinicCare</span>
          <span>Health for every clinic.</span>
        </div>
      </footer>
    </main>
  );
}