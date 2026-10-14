import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function constantTimeHexEquals(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/i.test(token))
    return NextResponse.json({ error: 'Acesso inválido' }, { status: 403 });
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from('consulting_cases')
    .select('status, paid_at, access_token_hash')
    .eq('id', id)
    .single();
  if (error || !data)
    return NextResponse.json({ error: 'Acesso inválido' }, { status: 403 });

  const hash = createHash('sha256').update(token).digest('hex');
  if (!constantTimeHexEquals(hash, data.access_token_hash))
    return NextResponse.json({ error: 'Acesso inválido' }, { status: 403 });

  const paid = Boolean(data.paid_at) && !['payment_refunded'].includes(data.status);
  const formUrl = paid ? (process.env.PERGUMI_FORM_URL || null) : null;
  return NextResponse.json({ status: data.status, paid, formUrl }, {
    headers: { 'Cache-Control': 'no-store, private' },
  });
}
