import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { isHttpsUrl } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PATCH(request: Request, context: { params: Promise<{id:string}> }) {
  const rejected = await adminGuard(request); if (rejected) return rejected;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return apiError('ID inválido');
  try {
    const body = await request.json() as Record<string, unknown>;
    const change: Record<string, unknown> = {};
    if ('title' in body) {
      const v = typeof body.title === 'string' ? body.title.trim() : '';
      if (v.length < 3 || v.length > 120) return apiError('Título inválido');
      change.title = v;
    }
    if ('description' in body) {
      if (typeof body.description !== 'string' || body.description.length > 2000) return apiError('Descrição inválida');
      change.description = body.description.trim();
    }
    if ('price_cents' in body) {
      if (!Number.isSafeInteger(body.price_cents) || (body.price_cents as number) < 1 || (body.price_cents as number) > 100000000)
        return apiError('Preço inválido');
      change.price_cents = body.price_cents;
    }
    if ('form_url' in body) {
      const v = body.form_url === '' || body.form_url === null ? null : body.form_url;
      if (v !== null && !isHttpsUrl(v)) return apiError('URL HTTPS inválida');
      change.form_url = v;
    }
    if ('is_active' in body) {
      if (typeof body.is_active !== 'boolean') return apiError('Status inválido');
      change.is_active = body.is_active;
    }
    if ('sort_order' in body) {
      if (!Number.isSafeInteger(body.sort_order) || Math.abs(body.sort_order as number) > 100000) return apiError('Ordem inválida');
      change.sort_order = body.sort_order;
    }
    if (!Object.keys(change).length) return apiError('Nenhum campo informado');
    change.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin().from('consulting_services').update(change).eq('id',id).select('*').maybeSingle();
    if (error || !data) { console.error('[admin:service:update]',error); return apiError('Serviço não atualizado',500); }
    return NextResponse.json({ service:data });
  } catch { return apiError('Dados inválidos'); }
}
