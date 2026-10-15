'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import '../admin.css';
export default function AdminLogin() {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setLoading(true);setError('');
    try {
      const response=await fetch('/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Acesso não autorizado');
      window.location.assign('/admin');
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível entrar');setLoading(false);}
  }
  return <main className="admin-login-shell"><section className="admin-login-card">
    <Link href="/" className="admin-back">← Voltar ao site</Link>
    <div className="admin-brandmark">TA<span>↗</span></div>
    <span className="admin-eyebrow">ÁREA RESTRITA</span>
    <h1>Seu espaço de gestão.</h1>
    <p>Acompanhe contratações, controle valores e gere novos pagamentos.</p>
    <form onSubmit={submit} className="admin-login-form">
      <label htmlFor="admin-email">E-mail do administrador</label>
      <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seuemail@exemplo.com"/>
      <label htmlFor="admin-password">Senha</label>
      <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button type="submit" className="admin-primary" disabled={loading}>{loading?'Entrando...':'Entrar no painel →'}</button>
    </form>
    <small>O login usa Supabase Auth. Acesso somente a usuários autorizados.</small>
  </section></main>;
}
