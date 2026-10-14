export const RAIO_X_PRICE = 120;

export type MercadoPagoPayment = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
};

function accessToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado');
  return token;
}

export async function createPreference(input: {
  caseId: string;
  accessToken: string;
  name: string;
  email: string;
}) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '');
  if (!appUrl || !appUrl.startsWith('https://')) {
    throw new Error('APP_URL deve ser um endereço público HTTPS');
  }
  const returnUrl = `${appUrl}/pagamento/retorno?case_id=${encodeURIComponent(input.caseId)}&token=${encodeURIComponent(input.accessToken)}`;
  const firstName = input.name.trim().split(/\s+/)[0];
  const surname = input.name.trim().split(/\s+/).slice(1).join(' ');
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{
        id: 'raio-x-ifood',
        title: 'Raio-X iFood — Diagnóstico de operação',
        description: 'Pré-análise, reunião e relatório com plano 7/14/30 dias',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: RAIO_X_PRICE,
      }],
      payer: { name: firstName, surname, email: input.email },
      external_reference: input.caseId,
      back_urls: {
        success: returnUrl,
        pending: returnUrl,
        failure: returnUrl,
      },
      auto_return: 'approved',
      // Configure o webhook em "Suas integrações" no Mercado Pago.
      // Não especifique notification_url aqui para manter uma única configuração.
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 600);
    console.error('Erro ao criar preferência MP:', response.status, detail);
    throw new Error('Não foi possível iniciar o checkout');
  }
  const preference = (await response.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
  const checkoutUrl = preference.init_point;
  if (!preference.id || !checkoutUrl || !checkoutUrl.startsWith('https://')) {
    throw new Error('Resposta incompleta do Mercado Pago');
  }
  return { preferenceId: preference.id, checkoutUrl };
}

export async function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `Bearer ${accessToken()}` }, cache: 'no-store' }
  );
  if (!response.ok) throw new Error(`Falha ao consultar pagamento MP: ${response.status}`);
  return (await response.json()) as MercadoPagoPayment;
}
