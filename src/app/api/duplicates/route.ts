import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit    = parseInt(searchParams.get('limit')     ?? '50', 10);
  const offset   = parseInt(searchParams.get('offset')    ?? '0',  10);
  const minDemos = parseInt(searchParams.get('min_demos') ?? '2',  10);

  // Query from demo_bookings with inner join to ai_lead_scores so the FK always
  // goes in the natural (parent → child) direction and avoids reverse-FK issues.
  const { data, error, count } = await supabase
    .from('demo_bookings')
    .select(`
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
      form_filled_at,
      ai_lead_scores!inner (
        id,
        score,
        score_label,
        demo_count,
        flags,
        alert_sent_to_team,
        reminder_sent_to_parent,
        scored_at,
        duplicate_detected
      )
    `, { count: 'exact' })
    .eq('ai_lead_scores.duplicate_detected', true)
    .gte('ai_lead_scores.demo_count', minDemos)
    .order('form_filled_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Normalise ai_lead_scores to a single object (UNIQUE constraint guarantees at most one)
  const normalized = (data ?? []).map((row) => {
    const scores = row.ai_lead_scores;
    const score  = Array.isArray(scores) ? scores[0] : scores;
    return { ...row, ai_lead_scores: score ?? null };
  });

  return NextResponse.json({ ok: true, data: normalized, count });
}
