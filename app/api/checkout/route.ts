import { NextResponse } from 'next/server';
import { createCaseCheckout, CheckoutError, type CheckoutInput } from '@/lib/checkout';

export async function POST(request: Request) {
  try {
    const input = await request.json() as CheckoutInput;
    const result = await createCaseCheckout(input);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof CheckoutError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('[checkout] erro:', error);
    return NextResponse.json({ error: 'Não foi possível iniciar o checkout.' }, { status: 500 });
  }
}
