import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin().from('consulting_services')
      .select('slug,title,description,price_cents').eq('is_active', true).is('deleted_at', null)
      .order('sort_order').order('title');
    if (error) throw error;
    return NextResponse.json({ services: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[services:public]', error);
    return NextResponse.json({ error: 'Serviços indisponíveis' }, { status: 503 });
  }
}
