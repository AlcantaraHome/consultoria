'use client';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

type Service={ id:string;slug:string;title:string;description:string;price_cents:number;form_url:string|null;is_active:boolean;sort_order:number };
type Case={id:string;client_name:string;email:string;phone:string;service_title:string|null;price_cents:number;status:string;created_at:string;paid_at:string|null;mp_payment_id:string|null;form_url:string|null};
type Tab='resumo'|'servicos'|'cobrancas'|'clientes'|'configuracoes';
type ServiceDraft={id?:string;slug:string;title:string;description:string;price:string;form_url:string;is_active:boolean;sort_order:number};
const emptyService:ServiceDraft={slug:'',title:'',description:'',price:'120,00',form_url:'',is_active:true,sort_order:0};
const statuses:Record<string,string>={awaiting_payment:'Aguardando pagamento',awaiting_form:'Formulário pendente',pre_analysis:'Pré-análise',awaiting_meeting:'Agendar reunião',report_in_progress:'Relatório em andamento',completed:'Concluído',payment_refunded:'Pagamento estornado'};
const formStages=['awaiting_form','pre_analysis','awaiting_meeting','report_in_progress','completed'];
const money=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const day=(s:string)=>new Date(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
const serviceDraft=(s:Service):ServiceDraft=>({id:s.id,slug:s.slug,title:s.title,description:s.description,price:(s.price_cents/100).toFixed(2).replace('.',','),form_url:s.form_url||'',is_active:s.is_active,sort_order:s.sort_order});
function cents(s:string){const cleaned=s.replace(/\s/g,'');const normalized=cleaned.includes(',')?cleaned.replace(/\./g,'').replace(',','.'):cleaned;const value=Number(normalized);return Number.isFinite(value)?Math.round(value*100):NaN;}
async function json<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{cache:'no-store',...init});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Não foi possível concluir.');
  return data as T;
}
const requestJSON=(method:string,body:unknown):RequestInit=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export default function Dashboard({adminEmail}:{adminEmail:string}){
  const [tab,setTab]=useState<Tab>('resumo');
  const [services,setServices]=useState<Service[]>([]);
  const [cases,setCases]=useState<Case[]>([]);
  const [defaultForm,setDefaultForm]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [editor,setEditor]=useState<ServiceDraft|null>(null);
  const [checkoutService,setCheckoutService]=useState('');
  const [checkoutName,setCheckoutName]=useState('');
  const [checkoutEmail,setCheckoutEmail]=useState('');
  const [checkoutPhone,setCheckoutPhone]=useState('');
  const [checkoutUrl,setCheckoutUrl]=useState('');
  const [checkoutCase,setCheckoutCase]=useState('');
  const [stageBusy,setStageBusy]=useState('');
  const reload=useCallback(async()=>{
    const [serviceData,caseData,settingsData]=await Promise.all([
      json<{services:Service[]}>('/api/admin/services'),
      json<{cases:Case[]}>('/api/admin/cases'),
      json<{settings:{default_form_url:string|null}}>('/api/admin/settings'),
    ]);
    setServices(serviceData.services);setCases(caseData.cases);
    setDefaultForm(settingsData.settings.default_form_url||'');
    setCheckoutService(prev=>prev || serviceData.services.find(s=>s.is_active)?.slug || '');
  },[]);
  useEffect(()=>{reload().catch(e=>setError(e.message)).finally(()=>setLoaded(true));},[reload]);
  const paid=useMemo(()=>cases.filter(c=>Boolean(c.paid_at) && c.status!=='payment_refunded'),[cases]);
  const revenue=paid.reduce((total,c)=>total+c.price_cents,0);
  const active=services.filter(s=>s.is_active);
  function toast(message:string){setNotice(message);setError('');}
  async function copy(value:string){try{await navigator.clipboard.writeText(value);toast('Link copiado.');}catch{setError('Seu navegador não permitiu copiar. Selecione o link manualmente.');}}
  const baseUrl=typeof window==='undefined'?'':window.location.origin;
  async function saveService(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!editor)return;
    setBusy(true);setError('');setNotice('');
    try{
      const price_cents=cents(editor.price);
      if(!Number.isSafeInteger(price_cents)||price_cents<=0)throw new Error('Informe um preço válido, por exemplo: 120,00');
      const payload={slug:editor.slug,title:editor.title,description:editor.description,price_cents,form_url:editor.form_url.trim(),is_active:editor.is_active,sort_order:editor.sort_order};
      const url=editor.id?`/api/admin/services/${editor.id}`:'/api/admin/services';
      await json(url,requestJSON(editor.id?'PATCH':'POST',payload));
      await reload();setEditor(null);toast('Serviço salvo. As próximas cobranças já utilizarão o novo preço.');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar serviço');}finally{setBusy(false);}
  }
  async function saveSettings(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try{await json('/api/admin/settings',requestJSON('PUT',{default_form_url:defaultForm.trim()}));toast('Formulário padrão atualizado, sem novo deploy.');}
    catch(e){setError(e instanceof Error?e.message:'Erro ao salvar');}
    finally{setBusy(false);}
  }
  async function createPayment(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');setNotice('');setCheckoutUrl('');setCheckoutCase('');
    try{
      const data=await json<{checkoutUrl:string;caseId:string}>('/api/admin/checkout-links',requestJSON('POST',{
        name:checkoutName,email:checkoutEmail,phone:checkoutPhone,serviceSlug:checkoutService,
      }));
      setCheckoutUrl(data.checkoutUrl);setCheckoutCase(data.caseId);
      await reload();toast('Cobrança criada. Envie o link ao cliente para ele pagar.');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar cobrança');}finally{setBusy(false);}
  }
  async function changeStage(c:Case,status:string){
    if(status===c.status)return;setStageBusy(c.id);setError('');
    try{await json(`/api/admin/cases/${c.id}`,requestJSON('PATCH',{status}));await reload();toast('Etapa atualizada.');}
    catch(e){setError(e instanceof Error?e.message:'Erro ao atualizar etapa');}finally{setStageBusy('');}
  }
  async function logout(){await fetch('/api/admin/auth/logout',{method:'POST'});window.location.assign('/admin/login');}
  const navigation:[Tab,string,string][]=[['resumo','Visão geral','▦'],['servicos','Serviços e preços','◇'],['cobrancas','Gerar checkout','↗'],['clientes','Contratações','◎'],['configuracoes','Configurações','⚙']];
  return <main className="admin-app">
    <aside className="admin-sidebar"><a href="/admin" className="admin-logo"><span>TA<span>↗</span></span><div><strong>THIAGO DE ALCÂNTARA</strong><small>PAINEL DE GESTÃO</small></div></a>
      <div className="admin-side-label">ESPAÇO DE TRABALHO</div>
      <nav className="admin-nav" aria-label="Menu administrativo">{navigation.map(([id,label,mark])=><button key={id} onClick={()=>{setTab(id);setError('');setNotice('');setEditor(null);}} className={tab===id?'selected':''}><span className="admin-nav-icon">{mark}</span>{label}</button>)}</nav>
      <div className="admin-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer">Ver site público ↗</a><div className="admin-user"><span className="admin-avatar">{adminEmail[0]?.toUpperCase()||'A'}</span><div><strong>Administrador</strong><small>{adminEmail}</small></div></div><button onClick={logout} className="admin-logout">Sair da conta →</button></div>
    </aside>
    <section className="admin-main"><header className="admin-topbar"><div><span className="admin-eyebrow">CENTRAL DE OPERAÇÕES</span><h1>{navigation.find(x=>x[0]===tab)?.[1]}</h1></div><button className="admin-top-action" onClick={()=>reload().then(()=>toast('Dados atualizados.')).catch(e=>setError(e.message))}>↻ Atualizar</button></header>
      <div className="admin-content">
      {error&&<div className="admin-alert admin-alert--error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Fechar">×</button></div>}
      {notice&&<div className="admin-alert admin-alert--success">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar">×</button></div>}
      {!loaded?<div className="admin-box">Carregando seus dados...</div>:<>
      {tab==='resumo'&&<>
        <div className="admin-welcome"><span>VISÃO DO NEGÓCIO</span><h2>Suas vendas. Suas decisões.<br/><em>Em um só lugar.</em></h2><p>Gerencie o catálogo, os links de pagamento e o andamento dos diagnósticos.</p><button className="admin-light-btn" onClick={()=>setTab('cobrancas')}>Criar nova cobrança ↗</button></div>
        <div className="admin-stats"><article><span>Serviços ativos</span><strong>{active.length}</strong><small>No catálogo</small></article><article><span>Contratações recentes</span><strong>{cases.length}</strong><small>Últimas 100</small></article><article><span>Pagamentos confirmados</span><strong>{paid.length}</strong><small>Sem estornos</small></article><article><span>Valor confirmado</span><strong>{money(revenue)}</strong><small>Dentro das últimas 100 contratações</small></article></div>
        <div className="admin-section-head"><div><span>ACOMPANHAMENTO</span><h2>Contratações recentes</h2></div><button className="admin-text-button" onClick={()=>setTab('clientes')}>Ver todas →</button></div>
        <CasesTable rows={cases.slice(0,6)} onStage={changeStage} busy={stageBusy}/>
      </>}
      {tab==='servicos'&&<>
        <div className="admin-section-head"><div><span>SEU CATÁLOGO</span><h2>Serviços sob seu controle</h2><p>Editar preços aqui atualiza o checkout das próximas contratações.</p></div><button className="admin-primary" onClick={()=>setEditor({...emptyService})}>+ Novo serviço</button></div>
        <div className="admin-services-list">{services.map(s=><article className="admin-service-card" key={s.id}><div><div className="admin-service-meta"><span className={s.is_active?'admin-status-chip':'admin-status-chip inactive'}>{s.is_active?'Publicado':'Inativo'}</span><span>/{s.slug}</span></div><h3>{s.title}</h3><p>{s.description||'Sem descrição'}</p><small>Formulário: {s.form_url?'Personalizado':'Padrão da consultoria'}</small></div><div className="admin-service-actions"><strong>{money(s.price_cents)}</strong><button onClick={()=>setEditor(serviceDraft(s))} className="admin-outline">Editar</button><button onClick={()=>copy(`${baseUrl}/contratar?servico=${encodeURIComponent(s.slug)}`)} disabled={!s.is_active} className="admin-text-button">Copiar link ↗</button></div></article>)}</div>
        <p className="admin-hint">Ao inativar um serviço, novos checkouts deixam de ser criados. Contratações anteriores não mudam.</p>
        {editor&&<div className="admin-modal-backdrop" onClick={()=>setEditor(null)}><section className="admin-modal" role="dialog" aria-modal="true" aria-label="Editar serviço" onClick={e=>e.stopPropagation()}><header><div><span className="admin-eyebrow">CATÁLOGO</span><h2>{editor.id?'Editar serviço':'Novo serviço'}</h2></div><button onClick={()=>setEditor(null)} aria-label="Fechar">×</button></header><form onSubmit={saveService} className="admin-form"><label>Título<input required minLength={3} maxLength={120} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})} placeholder="Ex.: Ajuste de cardápio"/></label><label>Identificador do link (não poderá ser alterado){editor.id&&<small>O link já foi criado e permanece estável.</small>}<input required disabled={Boolean(editor.id)} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={editor.slug} onChange={e=>setEditor({...editor,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})} placeholder="ajuste-cardapio"/></label><label>Descrição<textarea maxLength={2000} rows={3} value={editor.description} onChange={e=>setEditor({...editor,description:e.target.value})}/></label><div className="admin-form-grid"><label>Preço (R$)<input required inputMode="decimal" value={editor.price} onChange={e=>setEditor({...editor,price:e.target.value})} placeholder="120,00"/></label><label>Ordem no catálogo<input type="number" value={editor.sort_order} onChange={e=>setEditor({...editor,sort_order:Number(e.target.value)})}/></label></div><label>URL específica do formulário (opcional)<input type="url" placeholder="https://pergumi..." value={editor.form_url} onChange={e=>setEditor({...editor,form_url:e.target.value})}/><small>Vazio utiliza o formulário padrão em Configurações.</small></label><label className="admin-check"><input type="checkbox" checked={editor.is_active} onChange={e=>setEditor({...editor,is_active:e.target.checked})}/> Serviço ativo e disponível para contratação</label><div className="admin-form-actions"><button type="button" className="admin-outline" onClick={()=>setEditor(null)}>Cancelar</button><button className="admin-primary" disabled={busy}>{busy?'Salvando...':'Salvar serviço'}</button></div></form></section></div>}
      </>}
      {tab==='cobrancas'&&<div className="admin-two-col"><section className="admin-box"><span className="admin-eyebrow">LINK EXCLUSIVO</span><h2>Gerar checkout para um cliente</h2><p>Preencha os dados do comprador. O sistema criará a contratação e o link de pagamento diretamente no Mercado Pago.</p><form className="admin-form" onSubmit={createPayment}><label>Serviço<select required value={checkoutService} onChange={e=>setCheckoutService(e.target.value)}>{active.map(s=><option key={s.id} value={s.slug}>{s.title} · {money(s.price_cents)}</option>)}</select></label><label>Nome completo<input required value={checkoutName} onChange={e=>setCheckoutName(e.target.value)} placeholder="Nome e sobrenome"/></label><label>E-mail<input type="email" required value={checkoutEmail} onChange={e=>setCheckoutEmail(e.target.value)}/></label><label>WhatsApp com DDD<input type="tel" required value={checkoutPhone} onChange={e=>setCheckoutPhone(e.target.value)} placeholder="(19) 99999-9999"/></label><button className="admin-primary" type="submit" disabled={busy||!active.length}>{busy?'Criando...':'Gerar checkout ↗'}</button></form>{checkoutUrl&&<div className="admin-generated"><strong>Checkout criado com sucesso</strong><p>Referência: {checkoutCase}</p><input readOnly value={checkoutUrl} onFocus={e=>e.target.select()}/><button className="admin-primary" onClick={()=>copy(checkoutUrl)}>Copiar link de pagamento</button><a href={checkoutUrl} target="_blank" rel="noreferrer">Abrir no Mercado Pago ↗</a></div>}</section><aside className="admin-box admin-box--secondary"><span className="admin-eyebrow">LINKS REUTILIZÁVEIS</span><h2>Compartilhe a contratação</h2><p>Para anúncios, Instagram e WhatsApp, utilize o link público de cada serviço. O cliente preenche os próprios dados e um novo checkout é criado automaticamente.</p>{active.map(s=><div className="admin-public-link" key={s.id}><span><strong>{s.title}</strong><small>{money(s.price_cents)}</small></span><button className="admin-outline" onClick={()=>copy(`${baseUrl}/contratar?servico=${s.slug}`)}>Copiar ↗</button></div>)}<a href="/servicos" target="_blank" rel="noreferrer" className="admin-text-button">Abrir catálogo público ↗</a></aside></div>}
      {tab==='clientes'&&<><div className="admin-section-head"><div><span>ACOMPANHAMENTO</span><h2>Contratações e atendimentos</h2><p>Etapas editáveis somente após a confirmação real do pagamento.</p></div></div><CasesTable rows={cases} onStage={changeStage} busy={stageBusy}/><p className="admin-hint">Mostrando as 100 contratações mais recentes. Não há confirmação manual de pagamentos: isso permanece exclusivo do Mercado Pago.</p></>}
      {tab==='configuracoes'&&<div className="admin-two-col"><section className="admin-box"><span className="admin-eyebrow">INTEGRAÇÃO PERGUMI</span><h2>Formulário padrão</h2><p>Defina qual formulário será exibido após os pagamentos dos serviços que não têm formulário próprio.</p><form className="admin-form" onSubmit={saveSettings}><label>URL do formulário<input type="url" value={defaultForm} placeholder="https://seu-pergumi.app/f/..." onChange={e=>setDefaultForm(e.target.value)}/></label><button className="admin-primary" disabled={busy}>{busy?'Salvando...':'Salvar alteração'}</button></form><p className="admin-hint">Não precisa alterar variáveis na Vercel nem fazer redeploy. Compras novas registram uma cópia da URL vigente. Compras anteriores mantêm a URL já associada a elas.</p></section><aside className="admin-box admin-box--secondary"><span className="admin-eyebrow">SEGURANÇA</span><h2>O que fica no servidor</h2><p>As chaves do Mercado Pago e do Supabase continuam nas variáveis protegidas da Vercel, nunca no banco de configurações da interface.</p><div className="admin-security-line">✓ Autenticação Supabase Auth</div><div className="admin-security-line">✓ Administradores autorizados no banco</div><div className="admin-security-line">✓ Preço validado no webhook</div><div className="admin-security-line">✓ Pagamento confirmado apenas pela API</div></aside></div>}
      </>}
      </div>
    </section>
  </main>;
}
function CasesTable({rows,onStage,busy}:{rows:Case[];onStage:(c:Case,s:string)=>void;busy:string}){
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Serviço</th><th>Data</th><th>Valor</th><th>Situação</th><th>Etapa</th></tr></thead><tbody>{rows.length?rows.map(c=><tr key={c.id}><td><strong>{c.client_name}</strong><small>{c.email}</small><small>{c.phone}</small></td><td>{c.service_title||'Raio-X iFood'}</td><td>{day(c.created_at)}</td><td className="admin-price-cell">{money(c.price_cents)}</td><td><span className={`admin-case-status ${c.paid_at&&c.status!=='payment_refunded'?'paid':''}`}>{statuses[c.status]||c.status}</span></td><td>{c.paid_at&&c.status!=='payment_refunded'?<select aria-label={`Etapa de ${c.client_name}`} disabled={busy===c.id} value={c.status} onChange={e=>onStage(c,e.target.value)}>{formStages.map(st=><option key={st} value={st}>{statuses[st]}</option>)}</select>:<span className="admin-muted">—</span>}</td></tr>):<tr><td colSpan={6} className="admin-empty">Ainda não há contratações para exibir.</td></tr>}</tbody></table></div>;
}
