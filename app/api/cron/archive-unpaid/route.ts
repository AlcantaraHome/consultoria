import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Chamada diária do Vercel Cron. Não expor esta operação sem CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') || '';
  const expected = secret ? `Bearer ${secret}` : '';
  const a = Buffer.from(authorization);
  const b = Buffer.from(expected);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b))
    return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });

  try {
    const db = supabaseAdmin();
    const { data: settings, error: settingsError } = await db.from('consulting_settings')
      .select('auto_archive_after_days').eq('id', 1).single();
    if (settingsError) throw settingsError;
    const days = settings?.auto_archive_after_days ?? 0;
    if (!Number.isInteger(days) || days < 0 || days > 90)
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 });
    if (days === 0) return NextResponse.json({ ok: true, archived: 0, disabled: true });

    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
    const { data, error } = await db.from('consulting_cases')
      .update({ archived_at: now.toISOString() })
      .eq('status', 'awaiting_payment')
      .is('paid_at', null)
      .is('archived_at', null)
      .lt('created_at', cutoff)
      .select('id');
    if (error) throw error;
    console.info('[cron:archive-unpaid]', { days, archived: data?.length ?? 0 });
    return NextResponse.json({ ok: true, archived: data?.length ?? 0, days });
  } catch (error) {
    console.error('[cron:archive-unpaid]', error);
    return NextResponse.json({ error: 'Falha no arquivamento automático' }, { status: 500 });
  }
}
