import { NextResponse } from 'next/server';
import { adminGuard, apiError } from '@/lib/admin-api';
import { supabaseAdmin } from '@/lib/supabase-admin';
export async function GET(request: Request) {
  const rejected = await adminGuard(request); if (rejected) return rejected;
  const { data, error } = await supabaseAdmin().from('consulting_cases')
    .select('id,client_name,email,phone,service_title,price_cents,status,created_at,paid_at,mp_payment_id,form_url')
    .order('created_at',{ascending:false}).limit(100);
  if (error) {console.error('[admin:cases]',error);return apiError('Erro ao carregar contratações',500);}
  return NextResponse.json({ cases:data }, { headers:{'Cache-Control':'no-store'} });
}
