import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPayment } from '@/lib/mercado-pago';

function constantTimeHexEquals(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ error: 'Acesso inválido' }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { data: current, error: findError } = await supabase
    .from('consulting_cases')
    .select('id, status, paid_at, price_cents, access_token_hash')
    .eq('id', id)
    .single();

  if (findError || !current) {
    return NextResponse.json({ error: 'Acesso inválido' }, { status: 403 });
  }

  const hash = createHash('sha256').update(token).digest('hex');
  if (!constantTimeHexEquals(hash, current.access_token_hash)) {
    return NextResponse.json({ error: 'Acesso inválido' }, { status: 403 });
  }

  // O Mercado Pago acrescenta payment_id aos back_urls. Essa informação NÃO é prova
  // de pagamento: sempre consultamos o pagamento na API do MP pelo servidor.
  const paymentId = url.searchParams.get('payment_id');
  if (
    !current.paid_at &&
    current.status === 'awaiting_payment' &&
    paymentId &&
    /^\d{1,25}$/.test(paymentId)
  ) {
    try {
      const payment = await getPayment(paymentId);
      const isApprovedForThisCase =
        String(payment.id) === paymentId &&
        payment.status === 'approved' &&
        payment.external_reference === current.id &&
        payment.currency_id === 'BRL' &&
        typeof payment.transaction_amount === 'number' &&
        Math.round(payment.transaction_amount * 100) === current.price_cents;

      if (isApprovedForThisCase) {
        const { error: updateError } = await supabase
          .from('consulting_cases')
          .update({
            status: 'awaiting_form',
            paid_at: new Date().toISOString(),
            mp_payment_id: paymentId,
          })
          .eq('id', current.id)
          .eq('status', 'awaiting_payment')
          .is('paid_at', null);

        if (updateError) {
          console.error('[mp:return] Falha ao gravar pagamento verificado:', updateError);
        } else {
          console.info('[mp:return] Conciliação solicitada:', { paymentId });
        }
      } else {
        console.info('[mp:return] Pagamento não aprovado ou não corresponde à contratação:', {
          paymentId,
          status: payment.status,
        });
      }
    } catch (error) {
      // Um erro transitório de consulta não deve invalidar a página de retorno;
      // o webhook de produção ainda poderá confirmar a compra.
      console.error('[mp:return] Falha ao consultar pagamento:', error);
    }
  }

  // Reconsulta para mostrar o status atual, inclusive caso um webhook concorrente
  // tenha concluído a atualização enquanto processávamos a conciliação.
  const { data: latest, error: readError } = await supabase
    .from('consulting_cases')
    .select('status, paid_at')
    .eq('id', current.id)
    .single();

  if (readError || !latest) {
    return NextResponse.json({ error: 'Falha ao consultar a contratação' }, { status: 500 });
  }

  const paid = Boolean(latest.paid_at) && latest.status !== 'payment_refunded';
  const formUrl = paid ? (process.env.PERGUMI_FORM_URL || null) : null;

  return NextResponse.json(
    { status: latest.status, paid, formUrl },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
}
