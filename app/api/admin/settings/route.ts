import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { isHttpsUrl } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';
export async function GET(request: Request) {
  const rejected = await adminGuard(request); if (rejected) return rejected;
  const { data, error } = await supabaseAdmin().from('consulting_settings').select('*').eq('id',1).single();
  if (error) return apiError('Não foi possível carregar configurações',500);
  return NextResponse.json({ settings:data }, { headers: {'Cache-Control':'no-store'} });
}
export async function PUT(request: Request) {
  const rejected = await adminGuard(request); if (rejected) return rejected;
  try {
    const body = await request.json();
    const url = body.default_form_url === '' || body.default_form_url == null ? null : body.default_form_url;
    if (url !== null && !isHttpsUrl(url)) return apiError('URL HTTPS inválida');
    const {data,error} = await supabaseAdmin().from('consulting_settings')
      .upsert({id:1,default_form_url:url,updated_at:new Date().toISOString()}).select('*').single();
    if (error) {console.error('[admin:settings]',error);return apiError('Erro ao salvar',500);}
    return NextResponse.json({ settings:data });
  } catch { return apiError('Dados inválidos'); }
}
