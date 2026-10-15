import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function adminAuthClient() {
  const cookieStore = await cookies();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY');
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não gravam cookies. O proxy cuida do refresh.
        }
      },
    },
  });
}

export async function currentAdmin() {
  const client = await adminAuthClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data, error: roleError } = await supabaseAdmin()
    .from('consulting_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (roleError || !data) return null;
  return { id: user.id, email: user.email || '' };
}

export function validOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch { return false; }
}
