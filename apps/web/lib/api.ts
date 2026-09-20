import { webConfig } from './config';

const API_URL = webConfig.apiUrl;

export async function getTenant(slug: string) {
  const response = await fetch(`${API_URL}${webConfig.apiBasePath}/public/tenant/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 }
  });
  if (!response.ok) return null;
  return response.json() as Promise<{ id: number; name: string; slug: string | null; legalName: string | null; email: string | null; phone: string | null; website: string | null; plan: string; status: string; settings: unknown }>;
}
