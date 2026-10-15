import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { isHttpsUrl } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase-admin';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const rejected = await adminGuard(request);
  if (rejected) return rejected;
  const { id } = await context.params;
  if (!uuid.test(id)) return apiError('ID inválido');

  try {
    const body = await request.json() as Record<string, unknown>;
    const db = supabaseAdmin();

    // Restaurar serviço excluído: mantemos inativo até a publicação manual.
    if (body.restore === true) {
      const { data, error } = await db.from('consulting_services')
        .update({ deleted_at: null, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id).not('deleted_at', 'is', null)
        .select('*').maybeSingle();
      if (error) {
        console.error('[admin:service:restore]', error);
        return apiError('Não foi possível restaurar o serviço', 500);
      }
      if (!data) return apiError('Serviço excluído não encontrado', 404);
      return NextResponse.json({ service: data });
    }

    const change: Record<string, unknown> = {};
    if ('title' in body) {
      const v = typeof body.title === 'string' ? body.title.trim() : '';
      if (v.length < 3 || v.length > 120) return apiError('Título inválido');
      change.title = v;
    }
    if ('description' in body) {
      if (typeof body.description !== 'string' || body.description.length > 2000) return apiError('Descrição inválida');
      change.description = body.description.trim();
    }
    if ('price_cents' in body) {
      if (!Number.isSafeInteger(body.price_cents) || (body.price_cents as number) < 1 || (body.price_cents as number) > 100000000)
        return apiError('Preço inválido');
      change.price_cents = body.price_cents;
    }
    if ('form_url' in body) {
      const v = body.form_url === '' || body.form_url === null ? null : body.form_url;
      if (v !== null && !isHttpsUrl(v)) return apiError('URL HTTPS inválida');
      change.form_url = v;
    }
    if ('is_active' in body) {
      if (typeof body.is_active !== 'boolean') return apiError('Status inválido');
      change.is_active = body.is_active;
    }
    if ('sort_order' in body) {
      if (!Number.isSafeInteger(body.sort_order) || Math.abs(body.sort_order as number) > 100000) return apiError('Ordem inválida');
      change.sort_order = body.sort_order;
    }
    if (!Object.keys(change).length) return apiError('Nenhum campo informado');
    change.updated_at = new Date().toISOString();

    const { data, error } = await db.from('consulting_services')
      .update(change).eq('id', id).is('deleted_at', null)
      .select('*').maybeSingle();
    if (error) {
      console.error('[admin:service:update]', error);
      return apiError('Serviço não atualizado', 500);
    }
    if (!data) return apiError('Serviço não encontrado no catálogo', 404);
    return NextResponse.json({ service: data });
  } catch (error) {
    console.error('[admin:service:patch]', error);
    return apiError('Dados inválidos');
  }
}

export async function DELETE(request: Request, context: Context) {
  const rejected = await adminGuard(request);
  if (rejected) return rejected;
  const { id } = await context.params;
  if (!uuid.test(id)) return apiError('ID inválido');

  const db = supabaseAdmin();
  const { data: service, error: lookupError } = await db.from('consulting_services')
    .select('id,slug,deleted_at').eq('id', id).maybeSingle();
  if (lookupError) {
    console.error('[admin:service:delete:lookup]', lookupError);
    return apiError('Não foi possível localizar o serviço', 500);
  }
  if (!service || service.deleted_at) return apiError('Serviço não encontrado no catálogo', 404);

  // A página principal da consultoria ainda usa este slug fixo.
  if (service.slug === 'raio-x-ifood') {
    return apiError('O Raio-X iFood é usado pela landing principal. Altere primeiro a landing antes de removê-lo.', 409);
  }

  // Exclusão lógica: histórico, preços contratados e conciliação continuam intactos.
  const { data, error } = await db.from('consulting_services')
    .update({ deleted_at: new Date().toISOString(), is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id).is('deleted_at', null)
    .select('id').maybeSingle();
  if (error) {
    console.error('[admin:service:delete]', error);
    return apiError('Não foi possível excluir o serviço', 500);
  }
  if (!data) return apiError('Serviço já excluído', 404);
  return NextResponse.json({ ok: true });
}
