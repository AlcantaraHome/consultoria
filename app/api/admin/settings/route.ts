import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { isHttpsUrl } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';

const allowedRetentionDays = new Set([0, 7, 14, 30, 60, 90]);

export async function GET(request: Request) {
  const rejected = await adminGuard(request);
  if (rejected) return rejected;
  const { data, error } = await supabaseAdmin().from('consulting_settings').select('*').eq('id', 1).single();
  if (error) return apiError('Não foi possível carregar configurações', 500);
  return NextResponse.json({ settings: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function PUT(request: Request) {
  const rejected = await adminGuard(request);
  if (rejected) return rejected;
  try {
    const body = await request.json() as Record<string, unknown>;
    const change: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
    if ('default_form_url' in body) {
      const url = body.default_form_url === '' || body.default_form_url == null ? null : body.default_form_url;
      if (url !== null && !isHttpsUrl(url)) return apiError('URL HTTPS inválida');
      change.default_form_url = url;
    }
    if ('auto_archive_after_days' in body) {
      if (typeof body.auto_archive_after_days !== 'number' || !allowedRetentionDays.has(body.auto_archive_after_days))
        return apiError('Prazo de arquivamento inválido');
      change.auto_archive_after_days = body.auto_archive_after_days;
    }
    if (Object.keys(change).length === 2) return apiError('Nenhuma configuração informada');
    const { data, error } = await supabaseAdmin().from('consulting_settings')
      .upsert(change).select('*').single();
    if (error) { console.error('[admin:settings]', error); return apiError('Erro ao salvar', 500); }
    return NextResponse.json({ settings: data });
  } catch { return apiError('Dados inválidos'); }
}
