'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

export default function ContratarPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone }),
      });
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || 'Não foi possível iniciar o pagamento.');
      }
      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <main className="checkout-shell">
      <header className="checkout-topline">
        <Link href="/" className="checkout-back">← Voltar para o Raio-X</Link>
        <span>Thiago de Alcântara</span>
      </header>

      <section className="checkout-grid">
        <div className="checkout-intro">
          <span className="eyebrow">CONTRATAÇÃO · RAIO-X IFOOD</span>
          <h1>Vamos começar pela sua operação.</h1>
          <p>Preencha seus dados para iniciar a contratação. O pagamento acontece no ambiente seguro do Mercado Pago.</p>
          <div className="checkout-summary">
            <strong>Raio-X iFood</strong>
            <p>Pré-análise, reunião individual, relatório e plano de ação 7 / 14 / 30 dias.</p>
            <div><span>Valor único</span><b>R$ 120,00</b></div>
          </div>
        </div>

        <form className="checkout-form" onSubmit={submit}>
          <h2>Seus dados</h2>
          <p>Usarei essas informações para identificar sua contratação e entrar em contato sobre o diagnóstico.</p>
          <label htmlFor="fullName">Nome completo</label>
          <input id="fullName" name="fullName" autoComplete="name" required minLength={3} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome e sobrenome" />
          <label htmlFor="customerEmail">E-mail</label>
          <input id="customerEmail" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" />
          <label htmlFor="customerPhone">WhatsApp com DDD</label>
          <input id="customerPhone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(19) 99999-9999" />
          <p className="checkout-privacy">Seus dados serão usados para processar esta contratação e prestar o Raio-X. Veja nossa <Link href="/privacidade">Política de Privacidade</Link>.</p>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="button button--primary button--full" type="submit" disabled={loading}>
            {loading ? 'Preparando pagamento...' : 'Continuar para pagamento →'}
          </button>
          <small>Você será direcionado ao Mercado Pago. O formulário será liberado após a confirmação do pagamento.</small>
        </form>
      </section>
    </main>
  );
}
