import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPayment } from '@/lib/mercado-pago';

function hasValidSignature(request: Request, dataId: string) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const requestId = request.headers.get('x-request-id');
  const header = request.headers.get('x-signature');
  if (!secret || !requestId || !header) return false;
  const attrs = Object.fromEntries(
    header.split(',').map(part => part.trim().split('=', 2))
  );
  const ts = attrs.ts;
  const v1 = attrs.v1;
  if (!ts || !/^\d+$/.test(ts) || !v1 || !/^[a-f0-9]{64}$/i.test(v1)) return false;
  // Manifesto oficial: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  const received = Buffer.from(v1, 'hex');
  return received.length === expected.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    console.info('[mp:webhook] Requisição recebida:', {
      method: request.method,
      eventType: url.searchParams.get('type') || url.searchParams.get('topic'),
      paymentId: url.searchParams.get('data.id'),
    });
    const eventType = url.searchParams.get('type') || url.searchParams.get('topic');
    if (eventType !== 'payment') return NextResponse.json({ ok: true });

    const paymentId = url.searchParams.get('data.id');
    if (!paymentId || !/^\d{1,25}$/.test(paymentId))
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    if (!hasValidSignature(request, paymentId))
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });

    // A notificação não é a fonte da verdade: consultamos o Mercado Pago.
    const payment = await getPayment(paymentId);
    if (!payment.external_reference ||
        payment.currency_id !== 'BRL' ||
        String(payment.id) !== paymentId) {
      return NextResponse.json({ error: 'Pagamento inválido' }, { status: 400 });
    }
    const supabase = supabaseAdmin();
    const { data: currentCase, error: findError } = await supabase
      .from('consulting_cases')
      .select('id, paid_at, status, price_cents')
      .eq('id', payment.external_reference)
      .maybeSingle();
    if (findError || !currentCase) {
      console.warn('[mp:webhook] Contratação não encontrada:', { paymentId });
      return NextResponse.json({ error: 'Contratação não encontrada' }, { status: 404 });
    }
    // O preço está congelado na contratação, mesmo que o admin o altere depois.
    if (typeof payment.transaction_amount !== 'number' ||
        Math.round(payment.transaction_amount * 100) !== currentCase.price_cents) {
      return NextResponse.json({ error: 'Valor não corresponde à contratação' }, { status: 400 });
    }

    if (payment.status === 'approved' && !currentCase.paid_at) {
      const { error } = await supabase.from('consulting_cases')
        .update({
          status: 'awaiting_form',
          paid_at: new Date().toISOString(),
          mp_payment_id: paymentId,
          archived_at: null,
        })
        .eq('id', currentCase.id)
        .is('paid_at', null);
      if (error) throw error;
    } else if (['refunded', 'charged_back'].includes(payment.status)) {
      const { error } = await supabase.from('consulting_cases')
        .update({ status: 'payment_refunded', mp_payment_id: paymentId, archived_at: null })
        .eq('id', currentCase.id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Falha webhook MP:', error);
    // 5xx permite o serviço de notificações tentar novamente.
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}
