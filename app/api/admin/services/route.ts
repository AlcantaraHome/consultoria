import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { isHttpsUrl } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const rejected = await adminGuard(request); if (rejected) return rejected;
  const { data, error } = await supabaseAdmin().from('consulting_services').select('*').order('sort_order').order('title');
  if (error) return apiError('Erro ao carregar serviços', 500);
  return NextResponse.json({ services: data }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  const rejected = await adminGuard(request); if (rejected) return rejected;
  try {
    const body = await request.json();
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const price = body.price_cents;
    const form = body.form_url === '' || body.form_url == null ? null : body.form_url;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return apiError('Slug inválido.');
    if (title.length < 3 || title.length > 120) return apiError('Título deve ter entre 3 e 120 caracteres.');
    if (description.length > 2000) return apiError('Descrição muito longa.');
    if (!Number.isSafeInteger(price) || price < 1 || price > 100000000) return apiError('Preço inválido. Informe centavos.');
    if (form !== null && !isHttpsUrl(form)) return apiError('Formulário exige URL HTTPS válida.');
    const { data, error } = await supabaseAdmin().from('consulting_services').insert({
      slug,title,description,price_cents:price,form_url:form,
      is_active: body.is_active !== false,
    }).select('*').single();
    if (error) { console.error('[admin:service:create]',error); return apiError('Não foi possível criar. O endereço do serviço pode já existir.',409); }
    return NextResponse.json({ service:data },{status:201});
  } catch { return apiError('Dados inválidos.'); }
}
