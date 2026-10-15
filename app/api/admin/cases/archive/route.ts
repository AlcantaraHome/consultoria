import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Arquivamento em lote: exclusivamente cobranças abertas, nunca pagamentos aprovados.
export async function POST(request: Request) {
  const rejected = await adminGuard(request);
  if (rejected) return rejected;
  let olderThanDays: number;
  try {
    const input = await request.json();
    olderThanDays = input.olderThanDays;
  } catch { return apiError('Dados inválidos'); }
  if (![1, 3, 7, 14, 30, 60, 90].includes(olderThanDays))
    return apiError('Prazo inválido');

  const now = new Date();
  const cutoff = new Date(now.getTime() - olderThanDays * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin().from('consulting_cases')
    .update({ archived_at: now.toISOString() })
    .eq('status', 'awaiting_payment')
    .is('paid_at', null)
    .is('archived_at', null)
    .lt('created_at', cutoff)
    .select('id');
  if (error) {
    console.error('[admin:cases:bulk-archive]', error);
    return apiError('Erro ao arquivar contratações', 500);
  }
  return NextResponse.json({ archived: data?.length ?? 0 });
}
