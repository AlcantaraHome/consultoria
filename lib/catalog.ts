import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type Service = {
  id: string; slug: string; title: string; description: string;
  price_cents: number; form_url: string | null; is_active: boolean; sort_order: number;
};

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && Boolean(url.hostname);
  } catch { return false; }
}
export const formatBRL = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export async function findService(slug: string): Promise<Service | null> {
  const { data, error } = await supabaseAdmin().from('consulting_services')
    .select('id,slug,title,description,price_cents,form_url,is_active,sort_order')
    .eq('slug', slug).eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data as Service | null;
}
export async function defaultFormUrl(): Promise<string | null> {
  const { data, error } = await supabaseAdmin().from('consulting_settings')
    .select('default_form_url').eq('id', 1).single();
  if (error) throw error;
  return data?.default_form_url || process.env.PERGUMI_FORM_URL || null;
}
export async function resolveFormUrl(serviceUrl: string | null) {
  return serviceUrl || await defaultFormUrl();
}
