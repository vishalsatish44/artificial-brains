import { createClient } from '@supabase/supabase-js';

const url         = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anon        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url) console.warn('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL');

// Public client — used in browser-facing API routes (read-only safe)
export const supabase = createClient(url, anon);

// Server-only admin client — bypasses RLS, never expose to browser
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false },
});
