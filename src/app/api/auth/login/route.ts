import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email and password required' }, { status: 400 });
  }

  if (!email.toLowerCase().endsWith('@supersheldon.com')) {
    return NextResponse.json({ ok: false, error: 'Access restricted to @supersheldon.com accounts' }, { status: 403 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Login failed' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const secure = process.env.NODE_ENV === 'production';

  res.cookies.set('sb-auth-token', data.session.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge,
    path: '/',
  });
  res.cookies.set('sb-user-email', data.user.email ?? '', {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  return res;
}
