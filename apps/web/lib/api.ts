const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';

export async function getTenant(slug: string) {
  const response = await fetch(`${API_URL}/api/v1/public/tenant/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 }
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ id: number; name: string; slug: string | null; legalName: string | null; email: string | null; phone: string | null; website: string | null; plan: string; status: string; settings: unknown }>;
}
