import { NextResponse } from 'next/server';
import { adminAuthClient, validOrigin } from '@/lib/admin-auth';
export async function POST(request: Request) {
  if (!validOrigin(request)) return NextResponse.json({ error: 'Origem inválida' }, { status: 403 });
  const client = await adminAuthClient();
  await client.auth.signOut();
  return NextResponse.json({ ok: true });
}
