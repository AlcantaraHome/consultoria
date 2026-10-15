import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { formatBRL } from '@/lib/catalog';

async function ServicesList() {
  await connection();
  const { data: services } = await supabaseAdmin()
    .from('consulting_services')
    .select('id,slug,title,description,price_cents')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order')
    .order('title');

  return (
    <>
      <div className="catalog-grid">
        {(services || []).map((service) => (
          <article className="catalog-card" key={service.id}>
            <span className="eyebrow">CONSULTORIA</span>
            <h2>{service.title}</h2>
            <p>{service.description}</p>
            <strong>{formatBRL(service.price_cents)}</strong>
            <Link
              className="button button--primary button--full"
              href={`/contratar?servico=${service.slug}`}
            >
              Contratar este serviço →
            </Link>
          </article>
        ))}
      </div>
      {!services?.length && <p>Nenhum serviço está disponível neste momento.</p>}
    </>
  );
}

export default function ServicesPage() {
  return (
    <main className="catalog-shell">
      <header className="catalog-top">
        <Link href="/">← Thiago de Alcântara</Link>
        <span>Consultoria para alimentação</span>
      </header>
      <div className="catalog-hero">
        <span className="eyebrow">SERVIÇOS</span>
        <h1>Escolha o próximo passo para o seu negócio.</h1>
        <p>Serviços individuais para analisar e melhorar sua operação de alimentação.</p>
      </div>
      <Suspense fallback={<p>Carregando serviços...</p>}>
        <ServicesList />
      </Suspense>
    </main>
  );
}
