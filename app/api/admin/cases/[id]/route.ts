import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { supabaseAdmin } from '@/lib/supabase-admin';

const stages = ['awaiting_form','pre_analysis','awaiting_meeting','report_in_progress','completed'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{id:string}> }) {
  const rejected = await adminGuard(request);
  if (rejected) return rejected;
  const { id } = await context.params;
  if (!uuid.test(id)) return apiError('ID inválido');

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return apiError('Dados inválidos'); }

  const db = supabaseAdmin();
  if ('archived' in body) {
    if (typeof body.archived !== 'boolean' || 'status' in body)
      return apiError('Operação inválida');
    // Somente tentativas não pagas podem ser arquivadas/restauradas.
    const update = { archived_at: body.archived ? new Date().toISOString() : null };
    let query = db.from('consulting_cases')
      .update(update).eq('id', id).eq('status', 'awaiting_payment').is('paid_at', null);
    query = body.archived ? query.is('archived_at', null) : query.not('archived_at', 'is', null);
    const { data, error } = await query.select('id, archived_at').maybeSingle();
    if (error) { console.error('[admin:case:archive]', error); return apiError('Falha ao alterar arquivamento', 500); }
    if (!data) return apiError('Somente contratações sem pagamento podem ser arquivadas ou restauradas', 409);
    return NextResponse.json({ case: data });
  }

  const status = body.status;
  if (typeof status !== 'string' || !stages.includes(status)) return apiError('Etapa inválida');
  const { data: existing, error: readError } = await db.from('consulting_cases')
    .select('paid_at,status').eq('id', id).maybeSingle();
  if (readError || !existing) return apiError('Contratação não encontrada', 404);
  if (!existing.paid_at || existing.status === 'payment_refunded')
    return apiError('Só é possível atualizar atendimento pago e não estornado', 409);
  const { data, error } = await db.from('consulting_cases')
    .update({ status }).eq('id', id).not('paid_at', 'is', null).neq('status', 'payment_refunded')
    .select('id,status').maybeSingle();
  if (error || !data) return apiError('Não foi possível atualizar a etapa', 409);
  return NextResponse.json({ case: data });
}
