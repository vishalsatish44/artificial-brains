import { NextRequest, NextResponse } from 'next/server';
import { runFullSync } from '@/lib/sync';

// POST /api/sync
// Optional body: { since: "2026-05-01T00:00:00Z" }  → incremental sync
// No body → full sync of all records
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const since: string | undefined = typeof body.since === 'string' ? body.since : undefined;

    const result = await runFullSync(since);

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// GET /api/sync → returns last sync log
export async function GET() {
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, logs: data });
}
