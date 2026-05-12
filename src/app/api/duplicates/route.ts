import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit    = parseInt(searchParams.get('limit')     ?? '50', 10);
  const offset   = parseInt(searchParams.get('offset')    ?? '0',  10);
  const minDemos = parseInt(searchParams.get('min_demos') ?? '2',  10);
  const search   = searchParams.get('search') ?? '';

  // Compute actual demo counts from demo_bookings (source of truth).
  // The stored demo_count in ai_lead_scores goes stale between syncs.
  const { data: bookingRows, error: bookingErr } = await supabase
    .from('demo_bookings')
    .select('student_id');

  if (bookingErr) return NextResponse.json({ ok: false, error: bookingErr.message }, { status: 500 });

  const actualCountMap = new Map<string, number>();
  for (const row of bookingRows ?? []) {
    if (row.student_id) {
      actualCountMap.set(row.student_id, (actualCountMap.get(row.student_id) ?? 0) + 1);
    }
  }

  let qualifyingStudentIds = [...actualCountMap.entries()]
    .filter(([, c]) => c >= minDemos)
    .map(([id]) => id);

  if (qualifyingStudentIds.length === 0) {
    return NextResponse.json({ ok: true, data: [], count: 0 });
  }

  // Narrow by search: keep only qualifying students who have at least one
  // booking matching the search term (name or phone).
  // NOTE: do NOT add .in(qualifyingStudentIds) here — it generates a URL that
  // is too long when there are many qualifying students, causing a silent failure
  // where searchRows comes back null and every search returns empty results.
  // Instead, fetch matching bookings from the whole table and intersect in memory.
  if (search) {
    const s = `%${search}%`;
    const digits = search.replace(/\D/g, '');
    const dp = digits && digits !== search ? `%${digits}%` : null;
    const parts = [
      `student_name.ilike."${s}"`,
      `guardian_name.ilike."${s}"`,
      `student_contact.ilike."${s}"`,
      `whatsapp_contact.ilike."${s}"`,
    ];
    if (dp) parts.push(`student_contact.ilike."${dp}"`, `whatsapp_contact.ilike."${dp}"`);

    const { data: searchRows, error: searchErr } = await supabase
      .from('demo_bookings')
      .select('student_id')
      .or(parts.join(','));

    if (searchErr) return NextResponse.json({ ok: false, error: searchErr.message }, { status: 500 });

    const qualifyingSet = new Set(qualifyingStudentIds);
    const matchedIds = new Set(
      (searchRows ?? [])
        .map((r) => r.student_id)
        .filter((id): id is string => Boolean(id) && qualifyingSet.has(id))
    );
    qualifyingStudentIds = [...matchedIds];

    if (qualifyingStudentIds.length === 0) {
      return NextResponse.json({ ok: true, data: [], count: 0 });
    }
  }

  const { data, error, count } = await supabase
    .from('ai_lead_scores')
    .select(`
      id,
      score,
      score_label,
      demo_count,
      student_id,
      flags,
      alert_sent_to_team,
      reminder_sent_to_parent,
      scored_at,
      duplicate_detected,
      demo_bookings (
        id,
        student_name,
        guardian_name,
        student_contact,
        whatsapp_contact,
        student_email,
        country,
        city,
        grade,
        demo_subject,
        demo_datetime_cx,
        lead_source,
        presales_agent_name,
        form_filled_at
      )
    `, { count: 'exact' })
    .eq('duplicate_detected', true)
    .in('student_id', qualifyingStudentIds)
    .order('scored_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const normalized = (data ?? []).map((row) => {
    const { demo_bookings, student_id, ...scoreInfo } = row;
    const booking = Array.isArray(demo_bookings) ? demo_bookings[0] : demo_bookings;
    const actualCount = student_id ? (actualCountMap.get(student_id) ?? scoreInfo.demo_count) : scoreInfo.demo_count;
    return {
      ...(booking ?? {}),
      ai_lead_scores: { ...scoreInfo, demo_count: actualCount },
    };
  });

  return NextResponse.json({ ok: true, data: normalized, count });
}
