'use client';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

type Service={ id:string;slug:string;title:string;description:string;price_cents:number;form_url:string|null;is_active:boolean;sort_order:number;deleted_at:string|null };
type Case={id:string;client_name:string;email:string;phone:string;service_title:string|null;price_cents:number;status:string;created_at:string;paid_at:string|null;mp_payment_id:string|null;form_url:string|null;service_id:string|null;archived_at:string|null};
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
  const [overviewCases,setOverviewCases]=useState<Case[]>([]);
  const [caseTotal,setCaseTotal]=useState(0);
  const [casePage,setCasePage]=useState(1);
  const [caseSearch,setCaseSearch]=useState('');
  const [searchDebounced,setSearchDebounced]=useState('');
  const [caseStatus,setCaseStatus]=useState('');
  const [caseService,setCaseService]=useState('');
  const [caseView,setCaseView]=useState('active');
  const [caseDateFrom,setCaseDateFrom]=useState('');
  const [caseDateTo,setCaseDateTo]=useState('');
  const [autoArchiveDays,setAutoArchiveDays]=useState(0);
  const [bulkDays,setBulkDays]=useState(7);
  const [casesLoading,setCasesLoading]=useState(false);
  const [defaultForm,setDefaultForm]=useState('');
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [editor,setEditor]=useState<ServiceDraft|null>(null);
  const [showDeletedServices,setShowDeletedServices]=useState(false);
  const [checkoutService,setCheckoutService]=useState('');
  const [checkoutName,setCheckoutName]=useState('');
  const [checkoutEmail,setCheckoutEmail]=useState('');
  const [checkoutPhone,setCheckoutPhone]=useState('');
  const [checkoutUrl,setCheckoutUrl]=useState('');
  const [checkoutCase,setCheckoutCase]=useState('');
  const [stageBusy,setStageBusy]=useState('');
  const reload=useCallback(async()=>{
    const [serviceData,overviewData,settingsData]=await Promise.all([
      json<{services:Service[]}>('/api/admin/services'),
      json<{cases:Case[]}>('/api/admin/cases?limit=100'),
      json<{settings:{default_form_url:string|null;auto_archive_after_days:number}}>('/api/admin/settings'),
    ]);
    setServices(serviceData.services);
    setOverviewCases(overviewData.cases);
    setDefaultForm(settingsData.settings.default_form_url||'');
    setAutoArchiveDays(settingsData.settings.auto_archive_after_days||0);
    setCheckoutService(prev=>{
      const available=serviceData.services.filter(s=>s.is_active && !s.deleted_at);
      return available.some(s=>s.slug===prev) ? prev : (available[0]?.slug || '');
    });
  },[]);
  useEffect(()=>{reload().catch(e=>setError(e.message)).finally(()=>setLoaded(true));},[reload]);
  useEffect(()=>{
    const timer=setTimeout(()=>setSearchDebounced(caseSearch),300);
    return ()=>clearTimeout(timer);
  },[caseSearch]);
  const loadCases=useCallback(async()=>{
    const query=new URLSearchParams({page:String(casePage),limit:'25',view:caseView});
    if(searchDebounced.trim())query.set('q',searchDebounced.trim());
    if(caseStatus)query.set('status',caseStatus);
    if(caseService)query.set('service',caseService);
    if(caseDateFrom)query.set('from',caseDateFrom);
    if(caseDateTo)query.set('to',caseDateTo);
    setCasesLoading(true);
    try{
      const data=await json<{cases:Case[];total:number}>(`/api/admin/cases?${query}`);
      setCases(data.cases);setCaseTotal(data.total);
    }finally{setCasesLoading(false);}
  },[casePage,caseView,searchDebounced,caseStatus,caseService,caseDateFrom,caseDateTo]);
  useEffect(()=>{
    if(!loaded)return;
    loadCases().catch(e=>setError(e.message));
  },[loaded,loadCases]);
  const paid=useMemo(()=>overviewCases.filter(c=>Boolean(c.paid_at) && c.status!=='payment_refunded'),[overviewCases]);
  const revenue=paid.reduce((total,c)=>total+c.price_cents,0);
  const active=services.filter(s=>s.is_active && !s.deleted_at);
  const visibleServices=services.filter(s=>showDeletedServices ? Boolean(s.deleted_at) : !s.deleted_at);
  const deletedServiceCount=services.filter(s=>Boolean(s.deleted_at)).length;
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
  async function deleteService(service:Service){
    if(service.slug==='raio-x-ifood'){
      setError('O Raio-X iFood ainda é usado pela landing principal. Para removê-lo, é necessário alterar primeiro o serviço padrão da página inicial.');
      return;
    }
    if(!window.confirm(`Excluir "${service.title}" do catálogo?\n\nO link público deixará de funcionar para novas contratações. As cobranças já criadas e o histórico serão mantidos. Você poderá restaurar o serviço depois.`))return;
    setBusy(true);setError('');setNotice('');
    try{
      await json<{ok:boolean}>(`/api/admin/services/${service.id}`,{method:'DELETE'});
      await reload();
      toast('Serviço excluído do catálogo. O histórico de vendas foi preservado.');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao excluir serviço');}
    finally{setBusy(false);}
  }
  async function restoreService(service:Service){
    setBusy(true);setError('');setNotice('');
    try{
      await json(`/api/admin/services/${service.id}`,requestJSON('PATCH',{restore:true}));
      setShowDeletedServices(false);
      await reload();
      toast('Serviço restaurado como inativo. Edite-o e marque "Serviço ativo" para publicá-lo.');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao restaurar serviço');}
    finally{setBusy(false);}
  }
  async function saveSettings(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try{await json('/api/admin/settings',requestJSON('PUT',{default_form_url:defaultForm.trim(),auto_archive_after_days:autoArchiveDays}));toast('Configurações atualizadas, sem novo deploy.');}
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
      await Promise.all([reload(),loadCases()]);toast('Cobrança criada. Envie o link ao cliente para ele pagar.');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar cobrança');}finally{setBusy(false);}
  }
  async function changeStage(c:Case,status:string){
    if(status===c.status)return;setStageBusy(c.id);setError('');
    try{await json(`/api/admin/cases/${c.id}`,requestJSON('PATCH',{status}));await Promise.all([reload(),loadCases()]);toast('Etapa atualizada.');}
    catch(e){setError(e instanceof Error?e.message:'Erro ao atualizar etapa');}finally{setStageBusy('');}
  }
  async function archiveCase(c:Case,archived:boolean){
    if(archived && !window.confirm(`Arquivar a tentativa sem pagamento de ${c.client_name}? Você poderá restaurá-la depois.`))return;
    setStageBusy(c.id);setError('');
    try{
      await json(`/api/admin/cases/${c.id}`,requestJSON('PATCH',{archived}));
      setCasePage(1);
      await reload();
      if(casePage===1)await loadCases();
      toast(archived?'Tentativa arquivada. O registro continua no banco.':'Tentativa restaurada.');
    }catch(e){setError(e instanceof Error?e.message:'Erro ao arquivar');}
    finally{setStageBusy('');}
  }
  async function bulkArchive(){
    if(!window.confirm(`Arquivar TODAS as contratações sem pagamento criadas há mais de ${bulkDays} dia(s)? Elas poderão ser restauradas depois.`))return;
    setBusy(true);setError('');
    try{
      const result=await json<{archived:number}>('/api/admin/cases/archive',requestJSON('POST',{olderThanDays:bulkDays}));
      setCasePage(1);
      await reload();
      if(casePage===1)await loadCases();
      toast(`${result.archived} tentativa(s) sem pagamento arquivada(s).`);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível arquivar em lote');}
    finally{setBusy(false);}
  }
  function resetCasePage(){setCasePage(1);}
  async function logout(){await fetch('/api/admin/auth/logout',{method:'POST'});window.location.assign('/admin/login');}
  const navigation:[Tab,string,string][]=[['resumo','Visão geral','▦'],['servicos','Serviços e preços','◇'],['cobrancas','Gerar checkout','↗'],['clientes','Contratações','◎'],['configuracoes','Configurações','⚙']];
  return <main className="admin-app">
    <aside className="admin-sidebar"><a href="/admin" className="admin-logo"><span>TA<span>↗</span></span><div><strong>THIAGO DE ALCÂNTARA</strong><small>PAINEL DE GESTÃO</small></div></a>
      <div className="admin-side-label">ESPAÇO DE TRABALHO</div>
      <nav className="admin-nav" aria-label="Menu administrativo">{navigation.map(([id,label,mark])=><button key={id} onClick={()=>{setTab(id);setError('');setNotice('');setEditor(null);}} className={tab===id?'selected':''}><span className="admin-nav-icon">{mark}</span>{label}</button>)}</nav>
      <div className="admin-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer">Ver site público ↗</a><div className="admin-user"><span className="admin-avatar">{adminEmail[0]?.toUpperCase()||'A'}</span><div><strong>Administrador</strong><small>{adminEmail}</small></div></div><button onClick={logout} className="admin-logout">Sair da conta →</button></div>
    </aside>
    <section className="admin-main"><header className="admin-topbar"><div><span className="admin-eyebrow">CENTRAL DE OPERAÇÕES</span><h1>{navigation.find(x=>x[0]===tab)?.[1]}</h1></div><button className="admin-top-action" onClick={()=>Promise.all([reload(),loadCases()]).then(()=>toast('Dados atualizados.')).catch(e=>setError(e.message))}>↻ Atualizar</button></header>
      <div className="admin-content">
      {error&&<div className="admin-alert admin-alert--error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Fechar">×</button></div>}
      {notice&&<div className="admin-alert admin-alert--success">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar">×</button></div>}
      {!loaded?<div className="admin-box">Carregando seus dados...</div>:<>
      {tab==='resumo'&&<>
        <div className="admin-welcome"><span>VISÃO DO NEGÓCIO</span><h2>Suas vendas. Suas decisões.<br/><em>Em um só lugar.</em></h2><p>Gerencie o catálogo, os links de pagamento e o andamento dos diagnósticos.</p><button className="admin-light-btn" onClick={()=>setTab('cobrancas')}>Criar nova cobrança ↗</button></div>
        <div className="admin-stats"><article><span>Serviços ativos</span><strong>{active.length}</strong><small>No catálogo</small></article><article><span>Contratações recentes</span><strong>{overviewCases.length}</strong><small>Últimas 100 não arquivadas</small></article><article><span>Pagamentos confirmados</span><strong>{paid.length}</strong><small>Sem estornos</small></article><article><span>Valor confirmado</span><strong>{money(revenue)}</strong><small>Dentro das últimas 100 contratações</small></article></div>
        <div className="admin-section-head"><div><span>ACOMPANHAMENTO</span><h2>Contratações recentes</h2></div><button className="admin-text-button" onClick={()=>setTab('clientes')}>Ver todas →</button></div>
        <CasesTable rows={overviewCases.slice(0,6)} onStage={changeStage} onArchive={archiveCase} busy={stageBusy}/>
      </>}
      {tab==='servicos'&&<>
        <div className="admin-section-head"><div><span>SEU CATÁLOGO</span><h2>Serviços sob seu controle</h2><p>Editar preços aqui atualiza o checkout das próximas contratações.</p></div><button className="admin-primary" onClick={()=>setEditor({...emptyService})}>+ Novo serviço</button></div>
        <div className="admin-services-toolbar">
          <p>Serviços excluídos saem do catálogo e deixam de gerar novos links. Vendas anteriores continuam no histórico.</p>
          <button type="button" className="admin-outline" onClick={()=>setShowDeletedServices(v=>!v)}>
            {showDeletedServices?'← Voltar ao catálogo':`Ver excluídos (${deletedServiceCount})`}
          </button>
        </div>
        <div className="admin-services-list">
          {visibleServices.length===0 && <div className="admin-services-empty">{showDeletedServices?'Nenhum serviço excluído.':'Nenhum serviço cadastrado. Clique em Novo serviço para começar.'}</div>}
          {visibleServices.map(s=><article className="admin-service-card" key={s.id}>
            <div>
              <div className="admin-service-meta">
                <span className={s.deleted_at?'admin-status-chip inactive':s.is_active?'admin-status-chip':'admin-status-chip inactive'}>{s.deleted_at?'Excluído':s.is_active?'Publicado':'Inativo'}</span>
                <span>/{s.slug}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.description||'Sem descrição'}</p>
              <small>Formulário: {s.form_url?'Personalizado':'Padrão da consultoria'}</small>
            </div>
            <div className="admin-service-actions">
              <strong>{money(s.price_cents)}</strong>
              {s.deleted_at ?
                <button className="admin-outline" disabled={busy} onClick={()=>restoreService(s)}>Restaurar</button>
              : <>
                <button className="admin-outline" disabled={busy} onClick={()=>setEditor(serviceDraft(s))}>Editar</button>
                <button className="admin-text-button" disabled={busy||!s.is_active} onClick={()=>copy(`${baseUrl}/contratar?servico=${encodeURIComponent(s.slug)}`)}>Copiar link ↗</button>
                {s.slug==='raio-x-ifood'
                  ? <small title="A landing principal depende desse serviço.">Serviço principal</small>
                  : <button type="button" className="admin-delete-button" disabled={busy} onClick={()=>deleteService(s)}>Excluir</button>}
              </>}
            </div>
          </article>)}
        </div>
        <p className="admin-hint">Excluir apenas retira o serviço do catálogo e desativa novos checkouts, sem apagar vendas ou reembolsar pagamentos. O Raio-X principal fica protegido porque a landing depende dele.</p>
        {editor&&<div className="admin-modal-backdrop" onClick={()=>setEditor(null)}><section className="admin-modal" role="dialog" aria-modal="true" aria-label="Editar serviço" onClick={e=>e.stopPropagation()}><header><div><span className="admin-eyebrow">CATÁLOGO</span><h2>{editor.id?'Editar serviço':'Novo serviço'}</h2></div><button onClick={()=>setEditor(null)} aria-label="Fechar">×</button></header><form onSubmit={saveService} className="admin-form"><label>Título<input required minLength={3} maxLength={120} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})} placeholder="Ex.: Ajuste de cardápio"/></label><label>Identificador do link (não poderá ser alterado){editor.id&&<small>O link já foi criado e permanece estável.</small>}<input required disabled={Boolean(editor.id)} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={editor.slug} onChange={e=>setEditor({...editor,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})} placeholder="ajuste-cardapio"/></label><label>Descrição<textarea maxLength={2000} rows={3} value={editor.description} onChange={e=>setEditor({...editor,description:e.target.value})}/></label><div className="admin-form-grid"><label>Preço (R$)<input required inputMode="decimal" value={editor.price} onChange={e=>setEditor({...editor,price:e.target.value})} placeholder="120,00"/></label><label>Ordem no catálogo<input type="number" value={editor.sort_order} onChange={e=>setEditor({...editor,sort_order:Number(e.target.value)})}/></label></div><label>URL específica do formulário (opcional)<input type="url" placeholder="https://pergumi..." value={editor.form_url} onChange={e=>setEditor({...editor,form_url:e.target.value})}/><small>Vazio utiliza o formulário padrão em Configurações.</small></label><label className="admin-check"><input type="checkbox" checked={editor.is_active} onChange={e=>setEditor({...editor,is_active:e.target.checked})}/> Serviço ativo e disponível para contratação</label><div className="admin-form-actions"><button type="button" className="admin-outline" onClick={()=>setEditor(null)}>Cancelar</button><button className="admin-primary" disabled={busy}>{busy?'Salvando...':'Salvar serviço'}</button></div></form></section></div>}
      </>}
      {tab==='cobrancas'&&<div className="admin-two-col"><section className="admin-box"><span className="admin-eyebrow">LINK EXCLUSIVO</span><h2>Gerar checkout para um cliente</h2><p>Preencha os dados do comprador. O sistema criará a contratação e o link de pagamento diretamente no Mercado Pago.</p><form className="admin-form" onSubmit={createPayment}><label>Serviço<select required value={checkoutService} onChange={e=>setCheckoutService(e.target.value)}>{active.map(s=><option key={s.id} value={s.slug}>{s.title} · {money(s.price_cents)}</option>)}</select></label><label>Nome completo<input required value={checkoutName} onChange={e=>setCheckoutName(e.target.value)} placeholder="Nome e sobrenome"/></label><label>E-mail<input type="email" required value={checkoutEmail} onChange={e=>setCheckoutEmail(e.target.value)}/></label><label>WhatsApp com DDD<input type="tel" required value={checkoutPhone} onChange={e=>setCheckoutPhone(e.target.value)} placeholder="(19) 99999-9999"/></label><button className="admin-primary" type="submit" disabled={busy||!active.length}>{busy?'Criando...':'Gerar checkout ↗'}</button></form>{checkoutUrl&&<div className="admin-generated"><strong>Checkout criado com sucesso</strong><p>Referência: {checkoutCase}</p><input readOnly value={checkoutUrl} onFocus={e=>e.target.select()}/><button className="admin-primary" onClick={()=>copy(checkoutUrl)}>Copiar link de pagamento</button><a href={checkoutUrl} target="_blank" rel="noreferrer">Abrir no Mercado Pago ↗</a></div>}</section><aside className="admin-box admin-box--secondary"><span className="admin-eyebrow">LINKS REUTILIZÁVEIS</span><h2>Compartilhe a contratação</h2><p>Para anúncios, Instagram e WhatsApp, utilize o link público de cada serviço. O cliente preenche os próprios dados e um novo checkout é criado automaticamente.</p>{active.map(s=><div className="admin-public-link" key={s.id}><span><strong>{s.title}</strong><small>{money(s.price_cents)}</small></span><button className="admin-outline" onClick={()=>copy(`${baseUrl}/contratar?servico=${s.slug}`)}>Copiar ↗</button></div>)}<a href="/servicos" target="_blank" rel="noreferrer" className="admin-text-button">Abrir catálogo público ↗</a></aside></div>}
      {tab==='clientes'&&<>
        <div className="admin-section-head"><div><span>ACOMPANHAMENTO</span><h2>Contratações e atendimentos</h2><p>Pesquise clientes, filtre por período e arquive tentativas sem pagamento.</p></div></div>
        <div className="admin-case-filters">
          <label>Pesquisar nome, e-mail ou telefone<input type="search" value={caseSearch} placeholder="Ex.: Maria ou (19) 99999-9999" onChange={e=>{setCaseSearch(e.target.value);resetCasePage();}}/></label>
          <label>Status<select value={caseStatus} onChange={e=>{setCaseStatus(e.target.value);resetCasePage();}}><option value="">Todos</option>{Object.entries(statuses).map(([id,title])=><option value={id} key={id}>{title}</option>)}</select></label>
          <label>Serviço<select value={caseService} onChange={e=>{setCaseService(e.target.value);resetCasePage();}}><option value="">Todos os serviços</option>{services.map(s=><option value={s.id} key={s.id}>{s.title}</option>)}</select></label>
          <label>Visualização<select value={caseView} onChange={e=>{setCaseView(e.target.value);resetCasePage();}}><option value="active">Em andamento</option><option value="archived">Arquivadas</option><option value="all">Todas</option></select></label>
          <label>Data inicial<input type="date" value={caseDateFrom} onChange={e=>{setCaseDateFrom(e.target.value);resetCasePage();}}/></label>
          <label>Data final<input type="date" value={caseDateTo} onChange={e=>{setCaseDateTo(e.target.value);resetCasePage();}}/></label>
        </div>
        <div className="admin-bulk-bar"><span>Limpeza de cobranças abandonadas</span><select aria-label="Prazo das tentativas sem pagamento" value={bulkDays} onChange={e=>setBulkDays(Number(e.target.value))}><option value={1}>Mais de 1 dia</option><option value={3}>Mais de 3 dias</option><option value={7}>Mais de 7 dias</option><option value={14}>Mais de 14 dias</option><option value={30}>Mais de 30 dias</option><option value={60}>Mais de 60 dias</option></select><button className="admin-outline" disabled={busy} onClick={bulkArchive}>{busy?'Arquivando...':'Arquivar em lote'}</button></div>
        <div className="admin-case-results"><span>{casesLoading?'Pesquisando...':`${caseTotal} contratação(ões) encontrada(s)`}</span><button className="admin-text-button" onClick={()=>{setCaseSearch('');setSearchDebounced('');setCaseStatus('');setCaseService('');setCaseView('active');setCaseDateFrom('');setCaseDateTo('');setCasePage(1);}}>Limpar filtros</button></div>
        <CasesTable rows={cases} onStage={changeStage} onArchive={archiveCase} busy={stageBusy}/>
        <div className="admin-pagination"><button className="admin-outline" disabled={casePage<=1||casesLoading} onClick={()=>setCasePage(p=>p-1)}>← Anterior</button><span>Página {casePage} de {Math.max(1,Math.ceil(caseTotal/25))}</span><button className="admin-outline" disabled={casePage>=Math.ceil(caseTotal/25)||casesLoading} onClick={()=>setCasePage(p=>p+1)}>Próxima →</button></div>
        <p className="admin-hint">Arquivar apenas oculta tentativas não pagas; a confirmação de um pagamento tardio restaura automaticamente a contratação. Nenhum pagamento pode ser aprovado manualmente aqui.</p>
      </>}
      {tab==='configuracoes'&&<div className="admin-two-col"><section className="admin-box"><span className="admin-eyebrow">INTEGRAÇÃO PERGUMI</span><h2>Formulário padrão</h2><p>Defina qual formulário será exibido após os pagamentos dos serviços que não têm formulário próprio.</p><form className="admin-form" onSubmit={saveSettings}><label>URL do formulário<input type="url" value={defaultForm} placeholder="https://seu-pergumi.app/f/..." onChange={e=>setDefaultForm(e.target.value)}/></label><label>Arquivar automaticamente tentativas sem pagamento<select value={autoArchiveDays} onChange={e=>setAutoArchiveDays(Number(e.target.value))}><option value={0}>Desativado</option><option value={7}>Após 7 dias</option><option value={14}>Após 14 dias</option><option value={30}>Após 30 dias</option><option value={60}>Após 60 dias</option><option value={90}>Após 90 dias</option></select><small>Arquiva, não exclui. Para funcionar, configure a rotina cron e CRON_SECRET na Vercel.</small></label><button className="admin-primary" disabled={busy}>{busy?'Salvando...':'Salvar alteração'}</button></form><p className="admin-hint">Não precisa alterar variáveis na Vercel nem fazer redeploy. Compras novas registram uma cópia da URL vigente. Compras anteriores mantêm a URL já associada a elas.</p></section><aside className="admin-box admin-box--secondary"><span className="admin-eyebrow">SEGURANÇA</span><h2>O que fica no servidor</h2><p>As chaves do Mercado Pago e do Supabase continuam nas variáveis protegidas da Vercel, nunca no banco de configurações da interface.</p><div className="admin-security-line">✓ Autenticação Supabase Auth</div><div className="admin-security-line">✓ Administradores autorizados no banco</div><div className="admin-security-line">✓ Preço validado no webhook</div><div className="admin-security-line">✓ Pagamento confirmado apenas pela API</div><div className="admin-payout-info"><h3>Conta de recebimento</h3><p>O Mercado Pago direciona as cobranças à conta vinculada às credenciais de produção (MP_ACCESS_TOKEN). Para configurar ou transferir o saldo à sua conta bancária, use sua conta Mercado Pago. Não é seguro trocar o destino pelo painel sem uma integração de contas autorizadas.</p><a href="https://www.mercadopago.com.br/" target="_blank" rel="noopener noreferrer" className="admin-text-button">Abrir Mercado Pago ↗</a></div></aside></div>}
      </>}
      </div>
    </section>
  </main>;
}
function CasesTable({rows,onStage,onArchive,busy}:{rows:Case[];onStage:(c:Case,s:string)=>void;onArchive:(c:Case,archived:boolean)=>void;busy:string}){
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Serviço</th><th>Data</th><th>Valor</th><th>Situação</th><th>Etapa</th><th>Ações</th></tr></thead><tbody>{rows.length?rows.map(c=><tr key={c.id}><td><strong>{c.client_name}</strong><small>{c.email}</small><small>{c.phone}</small></td><td>{c.service_title||'Raio-X iFood'}</td><td>{day(c.created_at)}</td><td className="admin-price-cell">{money(c.price_cents)}</td><td><span className={`admin-case-status ${c.paid_at&&c.status!=='payment_refunded'?'paid':''}`}>{c.archived_at?'Arquivada':(statuses[c.status]||c.status)}</span></td><td>{c.paid_at&&c.status!=='payment_refunded'?<select aria-label={`Etapa de ${c.client_name}`} disabled={busy===c.id} value={c.status} onChange={e=>onStage(c,e.target.value)}>{formStages.map(st=><option key={st} value={st}>{statuses[st]}</option>)}</select>:<span className="admin-muted">—</span>}</td><td>{!c.paid_at&&c.status==='awaiting_payment'?<button className="admin-text-button" disabled={busy===c.id} onClick={()=>onArchive(c,!Boolean(c.archived_at))}>{c.archived_at?'Restaurar':'Arquivar'}</button>:<span className="admin-muted">—</span>}</td></tr>):<tr><td colSpan={7} className="admin-empty">Nenhuma contratação corresponde aos filtros.</td></tr>}</tbody></table></div>;
}
