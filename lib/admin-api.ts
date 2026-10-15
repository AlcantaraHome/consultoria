import 'server-only';
import { NextResponse } from 'next/server';
import { currentAdmin, validOrigin } from '@/lib/admin-auth';
export async function adminGuard(request: Request) {
  if (request.method !== 'GET' && !validOrigin(request))
    return NextResponse.json({ error: 'Origem inválida' }, { status: 403 });
  if (!(await currentAdmin()))
    return NextResponse.json({ error: 'Acesso administrativo necessário' }, { status: 401 });
  return null;
}
export const apiError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
