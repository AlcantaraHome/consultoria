import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/admin-auth';
export async function GET() {
  const user = await currentAdmin();
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 401 });
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
}
