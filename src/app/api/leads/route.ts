import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;

  const label       = sp.get('label');
  const limit       = parseInt(sp.get('limit')  ?? '50',  10);
  const offset      = parseInt(sp.get('offset') ?? '0',   10);
  const country     = sp.get('country');
  const grade       = sp.get('grade');
  const demoSubject = sp.get('demo_subject');
  const leadSource  = sp.get('lead_source');
  const agent       = sp.get('agent');
  const dateFrom    = sp.get('date_from');
  const dateTo      = sp.get('date_to');
  const search      = sp.get('search');

  // Use !inner join when filtering by label so parent rows are excluded when
  // no matching score exists, rather than just filtering the embedded array.
  const scoreJoin = label ? 'ai_lead_scores!inner' : 'ai_lead_scores';

  let query = supabase
    .from('demo_bookings')
    .select(`
      id,
      airtable_record_id,
      student_name,
      guardian_name,
      student_contact,
      whatsapp_contact,
      student_email,
      country,
      city,
      country_code,
      grade,
      lead_source,
      demo_subject,
      demo_datetime_cx,
      prior_booking,
      trial_classes_already_taken,
      presales_agent_name,
      form_filled_at,
      ${scoreJoin} (
        score,
        score_label,
        duplicate_detected,
        demo_count,
        flags,
        alert_sent_to_team,
        reminder_sent_to_parent
      )
    `, { count: 'exact' })
    .order('form_filled_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (label)       query = query.eq('ai_lead_scores.score_label', label);
  if (country)     query = query.eq('country', country);
  if (grade)       query = query.eq('grade', grade);
  if (demoSubject) query = query.eq('demo_subject', demoSubject);
  if (leadSource)  query = query.eq('lead_source', leadSource);
  if (agent)       query = query.contains('presales_agent_name', [agent]);
  if (dateFrom)    query = query.gte('form_filled_at', new Date(dateFrom).toISOString());
  if (dateTo)      query = query.lte('form_filled_at', new Date(dateTo + 'T23:59:59').toISOString());
  if (search) {
    const s = `%${search}%`;
    query = query.or(`student_name.ilike.${s},guardian_name.ilike.${s},student_contact.ilike.${s},student_email.ilike.${s}`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const normalized = (data ?? []).map((row) => ({
    ...row,
    ai_lead_scores: row.ai_lead_scores
      ? (Array.isArray(row.ai_lead_scores) ? row.ai_lead_scores : [row.ai_lead_scores])
      : [],
  }));

  return NextResponse.json({ ok: true, data: normalized, count });
}
