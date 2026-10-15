import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { supabaseAdmin } from '@/lib/supabase-admin';

const statuses = new Set([
  'awaiting_payment', 'awaiting_form', 'pre_analysis', 'awaiting_meeting',
  'report_in_progress', 'completed', 'payment_refunded',
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const rejected = await adminGuard(request);
  if (rejected) return rejected;
  const url = new URL(request.url);
  const p = url.searchParams;
  const status = p.get('status') || '';
  const service = p.get('service') || '';
  const view = p.get('view') || 'active';
  const from = p.get('from') || '';
  const to = p.get('to') || '';
  const q = (p.get('q') || '').trim().slice(0, 80);
  const page = Number(p.get('page') || 1);
  const limit = Number(p.get('limit') || 25);

  if (status && !statuses.has(status)) return apiError('Status inválido');
  if (service && !uuid.test(service)) return apiError('Serviço inválido');
  if (!['active', 'archived', 'all'].includes(view)) return apiError('Visualização inválida');
  if ((from && !date.test(from)) || (to && !date.test(to)) || (from && to && from > to)) return apiError('Período inválido');
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    return apiError('Paginação inválida');

  let query = supabaseAdmin().from('consulting_cases')
    .select('id,client_name,email,phone,service_id,service_title,price_cents,status,created_at,paid_at,mp_payment_id,form_url,archived_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (view === 'active') query = query.is('archived_at', null);
  if (view === 'archived') query = query.not('archived_at', 'is', null);
  if (status) query = query.eq('status', status);
  if (service) query = query.eq('service_id', service);
  if (from) query = query.gte('created_at', `${from}T00:00:00-03:00`);
  if (to) query = query.lte('created_at', `${to}T23:59:59.999-03:00`);
  if (q) {
    // Escapa a gramática do filtro PostgREST e os curingas LIKE.
    // Normaliza em vez de concatenar caracteres especiais de consulta.
    const safe = q.replace(/[^\p{L}\p{N}\s@.\-+]/gu, '').trim().replace(/_/g, '');
    const phone = q.replace(/\D/g, '');
    if (safe || phone.length >= 3) {
      const conditions: string[] = [];
      if (safe) {
        conditions.push(`client_name.ilike.%${safe}%`, `email.ilike.%${safe}%`);
      }
      if (phone.length >= 3) conditions.push(`phone.ilike.%${phone}%`);
      query = query.or(conditions.join(','));
    }
  }
  const offset = (page - 1) * limit;
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    console.error('[admin:cases:list]', error);
    return apiError('Erro ao pesquisar contratações', 500);
  }
  return NextResponse.json({ cases: data || [], total: count ?? 0, page, limit }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
