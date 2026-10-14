import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createPreference } from '@/lib/mercado-pago';

type CheckoutInput = { name?: unknown; email?: unknown; phone?: unknown };
const bad = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CheckoutInput;
    const name = typeof input.name === 'string' ? input.name.replace(/\s+/g, ' ').trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const phone = typeof input.phone === 'string' ? input.phone.replace(/\D/g, '') : '';

    if (name.length < 3 || name.length > 120 || !name.includes(' '))
      return bad('Informe seu nome completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return bad('Informe um e-mail válido.');
    if (!/^\d{10,11}$/.test(phone))
      return bad('Informe seu WhatsApp com DDD.');

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const supabase = supabaseAdmin();
    const { data: consultingCase, error } = await supabase
      .from('consulting_cases')
      .insert({
        client_name: name,
        email,
        phone,
        access_token_hash: tokenHash,
        status: 'awaiting_payment',
        price_cents: 12000,
      })
      .select('id')
      .single();
    if (error || !consultingCase) throw new Error('Não foi possível registrar a contratação');

    const { preferenceId, checkoutUrl } = await createPreference({
      caseId: consultingCase.id,
      accessToken: token,
      name,
      email,
    });
    const { error: saveError } = await supabase.from('consulting_cases')
      .update({ mp_preference_id: preferenceId })
      .eq('id', consultingCase.id);
    if (saveError) throw new Error('Não foi possível salvar a preferência de pagamento');

    return NextResponse.json({ checkoutUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Falha checkout:', error);
    return bad('Não foi possível iniciar o checkout. Tente novamente.', 500);
  }
}
