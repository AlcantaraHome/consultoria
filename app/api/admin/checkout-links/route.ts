import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { createCaseCheckout, CheckoutError, type CheckoutInput } from '@/lib/checkout';
export async function POST(request:Request){
  const rejected=await adminGuard(request);if(rejected)return rejected;
  try{
    const input=await request.json() as CheckoutInput;
    const result=await createCaseCheckout(input);
    return NextResponse.json(result, {headers:{'Cache-Control':'no-store'}});
  }catch(err){
    if(err instanceof CheckoutError)return apiError(err.message);
    console.error('[admin:checkout-links]',err);
    return apiError('Não foi possível gerar link de pagamento',500);
  }
}
