import { NextResponse } from 'next/server';
import { adminAuthClient, validOrigin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
export async function POST(request: Request) {
  if (!validOrigin(request)) return NextResponse.json({ error: 'Origem inválida' }, { status: 403 });
  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 200)
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    const auth = await adminAuthClient();
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.user) return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 });
    const { data: allowed, error: roleError } = await supabaseAdmin().from('consulting_admins')
      .select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (roleError || !allowed) {
      await auth.auth.signOut();
      return NextResponse.json({ error: 'Usuário sem acesso administrativo' }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) { console.error('[admin:login]',err); return NextResponse.json({ error: 'Falha de autenticação' }, { status: 500 }); }
}
