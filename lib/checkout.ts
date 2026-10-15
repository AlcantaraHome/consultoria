import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createPreference } from '@/lib/mercado-pago';
import { findService, resolveFormUrl } from '@/lib/catalog';

export type CheckoutInput = { name?: unknown; email?: unknown; phone?: unknown; serviceSlug?: unknown };
export class CheckoutError extends Error {}

export async function createCaseCheckout(input: CheckoutInput) {
  const name = typeof input.name === 'string' ? input.name.replace(/\s+/g, ' ').trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.replace(/\D/g, '') : '';
  const slug = typeof input.serviceSlug === 'string' ? input.serviceSlug : 'raio-x-ifood';
  if (name.length < 3 || name.length > 120 || !name.includes(' ')) throw new CheckoutError('Informe seu nome completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new CheckoutError('Informe um e-mail válido.');
  if (!/^\d{10,11}$/.test(phone)) throw new CheckoutError('Informe seu WhatsApp com DDD.');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new CheckoutError('Serviço inválido.');
  const service = await findService(slug);
  if (!service) throw new CheckoutError('Serviço indisponível.');
  const formUrl = await resolveFormUrl(service.form_url);
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const supabase = supabaseAdmin();
  const { data: consultingCase, error } = await supabase.from('consulting_cases').insert({
    client_name: name, email, phone, access_token_hash: tokenHash,
    status: 'awaiting_payment', price_cents: service.price_cents,
    service_id: service.id, service_title: service.title, form_url: formUrl,
  }).select('id').single();
  if (error || !consultingCase) throw new Error('Não foi possível registrar a contratação');
  const { preferenceId, checkoutUrl } = await createPreference({
    caseId: consultingCase.id, accessToken: token, name, email,
    title: service.title, description: service.description,
    priceCents: service.price_cents,
  });
  const { error: saveError } = await supabase.from('consulting_cases')
    .update({ mp_preference_id: preferenceId }).eq('id', consultingCase.id);
  if (saveError) throw new Error('Não foi possível salvar a preferência');
  return { checkoutUrl, caseId: consultingCase.id, priceCents: service.price_cents };
}
