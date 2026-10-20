'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Status = { status: string; paid: boolean; formUrl: string | null };

export default function PaymentReturn() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState('Consultando a confirmação do seu pagamento...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('case_id');
    const token = params.get('token');
    // O Checkout Pro acrescenta payment_id ao redirecionar para o back_url.
    const paymentId = params.get('payment_id') || params.get('collection_id');

    if (!id || !token) {
      setMessage('Não encontramos os dados de acompanhamento desta contratação.');
      return;
    }

    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function check() {
      try {
        const query = new URLSearchParams({ token: token! });
        if (paymentId && /^\d{1,25}$/.test(paymentId)) {
          query.set('payment_id', paymentId);
        }
        const response = await fetch(
          `/api/cases/${encodeURIComponent(id!)}/status?${query.toString()}`,
          { cache: 'no-store' },
        );
        if (!response.ok) throw new Error('Não foi possível validar o acesso.');

        const result = (await response.json()) as Status;
        if (stopped) return;
        setStatus(result);

        if (result.paid || result.status === 'payment_refunded') {
          if (timer) clearInterval(timer);
        } else {
          setMessage('O pagamento ainda não foi confirmado. Se você acabou de pagar, aguarde alguns instantes.');
        }
      } catch {
        if (!stopped) {
          setMessage('Não conseguimos consultar agora. Atualize esta página ou entre em contato.');
        }
      }
    }

    void check();
    timer = setInterval(() => { void check(); }, 6000);

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const approved = status?.paid === true;
  return (
    <main className="payment-shell">
      <Link href="/" className="checkout-back">← Voltar ao site</Link>
      <article className="payment-panel">
        <span className="eyebrow">ACOMPANHAMENTO DO PAGAMENTO</span>
        <h1>{approved ? 'Pagamento confirmado.' : 'Estamos conferindo seu pagamento.'}</h1>
        {approved ? (
          <>
            <p>Seu pagamento foi confirmado e a contratação foi registrada.</p>
            {status?.formUrl ? (
              <>
                <p>Para continuar, preencha o formulário do serviço contratado.</p>
                <a className="button button--primary" href={status.formUrl} rel="noopener noreferrer" target="_blank">Preencher formulário →</a>
              </>
            ) : (
              <p className="checkout-error">O pagamento está confirmado, mas o link do formulário ainda não foi configurado. Entre em contato para recebê-lo.</p>
            )}
          </>
        ) : (
          <>
            <p>{status?.status === 'payment_refunded' ? 'O pagamento foi estornado. Entre em contato para orientações.' : message}</p>
            <button className="button button--ghost" type="button" onClick={() => window.location.reload()}>Verificar novamente</button>
          </>
        )}
        <p className="payment-footnote">Se tiver qualquer problema com a contratação, utilize o contato informado na página inicial.</p>
      </article>
    </main>
  );
}
