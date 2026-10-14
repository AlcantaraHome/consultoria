import Link from 'next/link';

export default function Privacidade() {
  return (
    <main className="legal-shell">
      <Link className="checkout-back" href="/contratar">← Voltar</Link>
      <h1>Como os dados são utilizados</h1>
      <p>Durante a contratação do Raio-X iFood, coletamos nome, WhatsApp e e-mail para registrar seu pedido, processar o pagamento e entrar em contato sobre a prestação do serviço.</p>
      <p>O pagamento é realizado no ambiente do Mercado Pago. Os dados informados no formulário de diagnóstico serão utilizados para analisar seu negócio e preparar sua reunião e relatório. Não solicitamos sua senha do iFood.</p>
      <p>Seus dados de contratação ficam armazenados no sistema da consultoria, com acesso restrito. Para solicitar informações, correção ou exclusão, use o canal de atendimento indicado no site, observadas as obrigações legais de guarda.</p>
      <p><strong>Antes de publicar:</strong> complete esta política com identificação do responsável, contato de privacidade, fornecedores utilizados e períodos de retenção. Este texto é uma base inicial, não uma política final.</p>
    </main>
  );
}
