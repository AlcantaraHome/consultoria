import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { supabaseAdmin } from '@/lib/supabase-admin';
const stages = ['awaiting_form','pre_analysis','awaiting_meeting','report_in_progress','completed'];
export async function PATCH(request: Request, context:{params:Promise<{id:string}>}) {
  const rejected=await adminGuard(request);if(rejected)return rejected;
  const {id}=await context.params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return apiError('ID inválido');
  try {
    const {status}=await request.json();
    if(!stages.includes(status))return apiError('Etapa inválida');
    // Nunca permitir criar pagamento aprovado via painel: só MP confirma.
    const db=supabaseAdmin();
    const {data:existing,error:readError}=await db.from('consulting_cases').select('paid_at,status').eq('id',id).maybeSingle();
    if(readError||!existing)return apiError('Contratação não encontrada',404);
    if(!existing.paid_at||existing.status==='payment_refunded')return apiError('Só é possível atualizar atendimento pago e não estornado',409);
    const {data,error}=await db.from('consulting_cases').update({status}).eq('id',id)
      .not('paid_at','is',null).neq('status','payment_refunded').select('id,status').maybeSingle();
    if(error||!data)return apiError('Não foi possível atualizar a etapa',409);
    return NextResponse.json({case:data});
  } catch {return apiError('Dados inválidos');}
}
