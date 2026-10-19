import { Suspense, cache } from 'react';
import { connection } from 'next/server';
import { findService, formatBRL } from '@/lib/catalog';
import BrandLogo from './brand-logo';
const hasWhatsApp = Boolean(process.env.NEXT_PUBLIC_WHATSAPP_URL);
const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "#faq";
const whatsappLabel = hasWhatsApp ? "Tirar uma dúvida no WhatsApp" : "Ver dúvidas antes de contratar";

const problems = [
  {
    title: "Os pedidos não chegam",
    description: "Você abre a loja, espera o movimento e não entende por que quase ninguém compra.",
  },
  {
    title: "O cliente olha, mas não pede",
    description: "Seu cardápio recebe visitas, mas talvez fotos, preços ou ofertas não estejam convencendo.",
  },
  {
    title: "Vende, mas o dinheiro desaparece",
    description: "Taxas, descontos, ingredientes e frete podem estar levando mais do que você imagina.",
  },
  {
    title: "Tudo depende de você",
    description: "Atrasos, retrabalho e falta de controle atrapalham a experiência e a rotina da operação.",
  },
];

const diagnosticItems = [
  ["Cardápio e fotos", "Se o cliente entende o que você vende e encontra motivos para escolher seus produtos."],
  ["Preços e margem", "Se os valores consideram ingredientes, embalagem, taxas e demais custos informados."],
  ["Promoções e anúncios", "Se descontos, frete e campanhas fazem sentido para seu objetivo e sua margem."],
  ["Visitas e pedidos", "Onde pode haver perda de conversão, usando os indicadores disponíveis."],
  ["Entrega e operação", "Se horários, preparo, logística e capacidade combinam com a promessa ao cliente."],
  ["Avaliações e recompra", "O que reclamações, experiência e hábitos de compra podem revelar."],
];

const steps = [
  ["01", "Você contrata", "Após a confirmação do pagamento, o formulário é liberado."],
  ["02", "Você me conta sobre a loja", "Preenche o formulário e informa o que já tem: cardápio, custos, números e dificuldades."],
  ["03", "Eu estudo seu caso", "Faço uma pré-análise e identifico quais informações ainda precisamos esclarecer."],
  ["04", "A gente conversa", "Entro em contato para marcar uma reunião e entender os detalhes que os números não mostram."],
  ["05", "Você recebe o plano", "Entrego um relatório com diagnóstico, prioridades e ações para 7, 14 e 30 dias."],
];

const faq = [
  ["O Raio-X é para quem está começando?", "Sim, desde que você tenha um negócio de alimentação em funcionamento ou uma operação concreta em preparação. O diagnóstico será adaptado ao estágio da loja e aos dados disponíveis."],
  ["E se eu não entender de números ou não souber meu CMV?", "Tudo bem. Você responde o que souber. Se faltarem informações importantes, vou explicar o que precisamos levantar. Não vou inventar resultados nem afirmar uma margem sem dados suficientes."],
  ["Vou precisar passar minha senha do iFood?", "Não. Você pode compartilhar informações, capturas de tela e relatórios do painel. Não preciso da sua senha para fazer o diagnóstico."],
  ["O que acontece depois que eu preencher?", "Suas informações entram na etapa de pré-análise. Em até 1 dia útil após o envio do formulário, entrarei em contato para agendar nossa reunião de diagnóstico."],
  ["Quando recebo meu relatório?", "O prazo de entrega será combinado após avaliarmos as informações e agendarmos a reunião. Prefiro definir uma data realista para seu caso a prometer um prazo que não consiga cumprir."],
  ["Você também faz as mudanças na minha loja?", "O Raio-X inclui análise, reunião e relatório com plano de ação. Se você quiser ajuda para executar alguma recomendação, posso apresentar um orçamento separado, sem obrigação de contratar."],
  ["Você garante mais vendas ou mais lucro?", "Não. O Raio-X ajuda a identificar problemas e definir próximos passos com mais critério. Resultados dependem de fatores como mercado, produto, operação e implementação das mudanças."],
  ["Posso falar com você antes de pagar?", "Claro. Se alguma dúvida não estiver respondida nesta página, você pode falar comigo antes de contratar."],
];

// A consulta ao Supabase só ocorre durante a requisição, dentro de Suspense.
// React cache compartilha o resultado entre as duas exibições de preço da mesma requisição.
const getRaioXPrice = cache(async (): Promise<number> => {
  await connection();
  const service = await findService('raio-x-ifood').catch(() => null);
  return service?.price_cents ?? 12000;
});

async function HeroPrice() {
  const price = await getRaioXPrice();
  return <span>{formatBRL(price)} • valor único</span>;
}

async function PurchasePrice() {
  const price = await getRaioXPrice();
  return (
    <strong>
      {(price / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </strong>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Thiago de Alcântara — início">
          <BrandLogo variant="signature" className="brand-logo--header" priority />
        </a>

        <nav className="nav" aria-label="Navegação principal">
          <a href="#raio-x">O Raio-X</a>
          <a href="/servicos">Serviços</a>
          <a href="#entrega">O que recebo</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#faq">Dúvidas</a>
          <a className="nav-whatsapp" href={whatsappUrl}>
            {hasWhatsApp ? "Falar comigo" : "Tirar dúvidas"}
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">RAIO-X IFOOD • PARA PEQUENOS NEGÓCIOS DE ALIMENTAÇÃO</span>

            <h1>
              Seu iFood vende pouco?
              <em> Ou vende e não sobra dinheiro?</em>
            </h1>

            <p className="hero-lead">
              Antes de baixar preços, ativar mais uma promoção ou gastar com anúncios,
              descubra o que pode estar travando sua loja. Eu analiso os dados e a
              operação para mostrar o que merece atenção primeiro.
            </p>

            <div className="hero-actions">
              <a className="button button--primary" href="#contratar">
                Quero analisar minha loja
              </a>
              <a className="button button--ghost" href={whatsappUrl}>
                {whatsappLabel}
              </a>
            </div>

            <div className="hero-trust">
              <Suspense fallback={<span>Valor disponível ao contratar</span>}>
                <HeroPrice />
              </Suspense>
              <span>Reunião individual</span>
              <span>Relatório com plano de ação</span>
            </div>
          </div>

          <aside className="hero-card" aria-label="Perguntas do diagnóstico">
            <div className="hero-card__top">
              <BrandLogo variant="symbol" />
              <div>
                <span>Thiago de Alcântara</span>
                <strong>Raio-X iFood</strong>
              </div>
            </div>

            <div className="hero-card__statement">
              <span>O QUE VAMOS INVESTIGAR</span>
              <strong>O problema é falta de pedidos, falta de margem ou algo na operação?</strong>
            </div>

            <div className="hero-card__checks">
              <div>
                <b>01</b>
                <span>
                  <strong>Por que não estão comprando?</strong>
                  <small>Visibilidade, cardápio, preço e conversão.</small>
                </span>
              </div>
              <div>
                <b>02</b>
                <span>
                  <strong>Quanto sobra de cada venda?</strong>
                  <small>Ingredientes, embalagem, taxas e promoções.</small>
                </span>
              </div>
              <div>
                <b>03</b>
                <span>
                  <strong>O que mudar primeiro?</strong>
                  <small>Prioridades possíveis para a realidade da sua loja.</small>
                </span>
              </div>
            </div>

            <div className="hero-card__footer">
              <span>ENTENDER</span>
              <i />
              <span>PRIORIZAR</span>
              <i />
              <span>AGIR</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="principle-strip" aria-label="Temas do diagnóstico">
        <div>
          <span>PEDIDOS</span>
          <span>PREÇOS</span>
          <span>MARGEM</span>
          <span>PROMOÇÕES</span>
          <span>OPERAÇÃO</span>
        </div>
      </section>

      <section className="section" id="raio-x">
        <div className="section-head">
          <span className="eyebrow">ISSO ACONTECE COM VOCÊ?</span>
          <h2>Você trabalha o dia inteiro. Mas a loja não dá o retorno que deveria?</h2>
          <p>
            Quando os resultados não aparecem, é fácil tentar resolver tudo com
            desconto. Só que problemas diferentes exigem decisões diferentes.
            O primeiro passo é entender o que está acontecendo.
          </p>
        </div>

        <div className="problem-grid">
          {problems.map(({ title, description }, index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section analysis-section">
        <div className="analysis-intro">
          <span className="eyebrow">O QUE É O RAIO-X</span>
          <h2>Um olhar de fora para encontrar o que você pode não estar vendo.</h2>
          <p>
            É uma análise individual da sua loja no iFood e da operação por trás dela.
            Em vez de uma receita pronta, você recebe orientações baseadas nas
            informações que apresentar e na conversa de diagnóstico.
          </p>
          <a className="inline-link" href="#contratar">Ver o que está incluído <span aria-hidden="true">→</span></a>
        </div>

        <div className="analysis-grid">
          {diagnosticItems.map(([title, description], index) => (
            <article key={title}>
              <span className="analysis-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section deliverables-section" id="entrega">
        <div className="deliverables-copy">
          <span className="eyebrow">O QUE VOCÊ LEVA</span>
          <h2>Não mais uma lista de dicas. Um caminho para começar.</h2>
          <p>
            Você não precisa resolver tudo de uma vez. Precisa saber o que
            priorizar, o que investigar melhor e quais ações fazem sentido
            para o tamanho do seu negócio.
          </p>
          <a className="inline-link" href="#contratar">Quero receber meu diagnóstico <span aria-hidden="true">→</span></a>
        </div>

        <div className="deliverables-list">
          <article>
            <span>01</span>
            <div>
              <h3>Uma reunião sobre a sua loja</h3>
              <p>Vamos conversar depois da pré-análise, com perguntas e observações específicas sobre sua operação.</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Um relatório para consultar depois</h3>
              <p>O que foi observado, o que merece atenção e o que ainda depende de confirmação.</p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>As prioridades do negócio</h3>
              <p>Quais problemas abordar primeiro — sem tentar corrigir dez coisas ao mesmo tempo.</p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <h3>Um plano de 7, 14 e 30 dias</h3>
              <p>Uma sequência prática de ações e verificações para orientar os próximos passos.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="section method-section" id="como-funciona">
        <div className="method-header">
          <div>
            <span className="eyebrow">DO PAGAMENTO AO RELATÓRIO</span>
            <h2>Você sabe o que acontece em cada etapa.</h2>
          </div>
          <p>
            Nada de pagar e ficar sem notícia. Você preenche o formulário,
            eu faço a pré-análise e entro em contato para marcar nossa reunião.
          </p>
        </div>

        <div className="steps">
          {steps.map(([number, title, description]) => (
            <article className="step" key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="deadline-box">
          <span>Você terá retorno</span>
          <strong>Em até 1 dia útil após enviar o formulário, entrarei em contato para agendarmos a reunião.</strong>
        </div>
      </section>

      <section className="section about-section" id="sobre">
        <div className="about-heading">
          <span className="eyebrow">QUEM VAI ANALISAR SEU NEGÓCIO?</span>
          <h2>Você vai falar diretamente comigo.</h2>
        </div>
        <div className="about-card">
          <div className="about-card__person">
            <BrandLogo variant="symbol" />
            <div>
              <strong>Thiago de Alcântara</strong>
              <small>Consultoria para pequenos negócios de alimentação</small>
            </div>
          </div>
          <div className="about-card__copy">
            <p>
              Eu conheço a rotina de uma operação de alimentação: cardápio,
              precificação, promoções, entrega e a preocupação com o que
              realmente sobra no fim do dia.
            </p>
            <p>
              Minha proposta é simples: olhar para o seu negócio com atenção,
              trabalhar com os dados que você tem e mostrar o que faz sentido
              melhorar — sem prometer um resultado que ninguém pode garantir.
            </p>
          </div>
        </div>
      </section>

      <section className="section positioning-section">
        <div className="positioning-panel positioning-panel--yes">
          <span>PARA QUEM É</span>
          <h3>Para quem toca o próprio negócio e quer decidir melhor.</h3>
          <ul>
            <li>Marmitarias, hamburguerias, lanchonetes, restaurantes e negócios de doces.</li>
            <li>Quem já vende no iFood, mas não entende o resultado.</li>
            <li>Quem está estruturando uma operação e quer evitar erros básicos.</li>
            <li>Quem precisa de orientação prática, não de palavras difíceis.</li>
          </ul>
        </div>
        <div className="positioning-panel positioning-panel--no">
          <span>O QUE É IMPORTANTE SABER</span>
          <h3>Diagnóstico não é promessa de faturamento.</h3>
          <ul>
            <li>A análise depende das informações disponíveis e fornecidas por você.</li>
            <li>Não peço senha nem acesso à sua conta.</li>
            <li>O Raio-X não inclui fazer alterações na sua loja.</li>
            <li>Se você quiser ajuda para executar, isso é opcional e orçado à parte.</li>
          </ul>
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="section-head section-head--narrow">
          <span className="eyebrow">PERGUNTAS FREQUENTES</span>
          <h2>Ainda tem alguma dúvida?</h2>
          <p>É normal querer entender o serviço antes de contratar. Veja as respostas abaixo.</p>
        </div>

        <div className="faq-list">
          {faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        {hasWhatsApp && (
          <div className="faq-contact">
            <span>Não encontrou sua resposta?</span>
            <a className="inline-link" href={whatsappUrl}>
              Fale comigo pelo WhatsApp <span aria-hidden="true">→</span>
            </a>
          </div>
        )}
      </section>

      <section className="section purchase-section" id="contratar">
        <div className="purchase-copy">
          <BrandLogo variant="symbol" />
          <span className="eyebrow">RAIO-X IFOOD</span>
          <h2>Descubra por onde começar a melhorar sua loja.</h2>
          <p>
            Por um valor único, você tem uma análise individual, uma conversa
            sobre sua operação e um relatório para orientar suas próximas decisões.
          </p>
          <p className="purchase-reassurance">
            Depois do formulário, entro em contato em até 1 dia útil para agendar a reunião.
          </p>
        </div>

        <div className="purchase-card">
          <span className="purchase-label">INVESTIMENTO ÚNICO NO RAIO-X</span>

          <div className="price">
            <small>R$</small>
            <Suspense fallback={<strong>—</strong>}>
              <PurchasePrice />
            </Suspense>
          </div>

          <ul>
            <li>Formulário para conhecer seu negócio</li>
            <li>Pré-análise individual</li>
            <li>Reunião de diagnóstico</li>
            <li>Relatório personalizado</li>
            <li>Plano prático de 7 / 14 / 30 dias</li>
          </ul>

          <a className="button button--primary button--full" href="/contratar">
            Quero contratar meu Raio-X
          </a>

          <p className="purchase-smallprint">A execução das recomendações, se desejada, é contratada separadamente.</p>

          <a className="purchase-whatsapp" href={whatsappUrl}>
            {hasWhatsApp ? "Prefiro tirar uma dúvida primeiro" : "Ver dúvidas antes de contratar"}
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <BrandLogo variant="signature" className="brand-logo--footer" />
        </div>

        <div className="footer-end">
          <div className="footer-words">
            <span>Entender</span>
            <span>Priorizar</span>
            <span>Agir</span>
          </div>
          <small>Consultoria independente, sem vínculo com o iFood.</small>
        </div>
      </footer>
    </main>
  );
}
