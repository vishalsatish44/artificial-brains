import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const PAGE = 1000;

function esc(val: unknown): string {
  const s = val == null ? '' : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const label = searchParams.get('label');

  type Row = Record<string, unknown>;
  const allRows: Row[] = [];

  for (let page = 0; ; page++) {
    let q = supabase
      .from('demo_bookings')
      .select(`
        student_name, guardian_name, student_contact, whatsapp_contact,
        student_email, country, city, grade, lead_source, demo_subject,
        demo_datetime_cx, prior_booking, trial_classes_already_taken,
        presales_agent_name, form_filled_at,
        ai_lead_scores ( score, score_label, duplicate_detected, demo_count, flags )
      `)
      .order('form_filled_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);

    if (label) q = q.eq('ai_lead_scores.score_label', label);

    const { data } = await q;
    if (!data || data.length === 0) break;
    allRows.push(...(data as Row[]));
    if (data.length < PAGE) break;
  }

  const HEADERS = [
    'Student Name', 'Guardian Name', 'Phone', 'WhatsApp', 'Email',
    'Country', 'City', 'Grade', 'Lead Source', 'Demo Subject',
    'Demo Date', 'Prior Booking', 'Trials Taken', 'Agent', 'Form Filled At',
    'AI Score', 'Score Label', 'Duplicate', 'Demo Count', 'Flags',
  ];

  const lines = allRows.map((row) => {
    const sc = Array.isArray(row.ai_lead_scores)
      ? (row.ai_lead_scores as Row[])[0]
      : (row.ai_lead_scores as Row | null);
    return [
      row.student_name, row.guardian_name, row.student_contact, row.whatsapp_contact,
      row.student_email, row.country, row.city, row.grade, row.lead_source,
      row.demo_subject, row.demo_datetime_cx, row.prior_booking,
      row.trial_classes_already_taken,
      Array.isArray(row.presales_agent_name)
        ? (row.presales_agent_name as string[]).join('; ')
        : row.presales_agent_name,
      row.form_filled_at,
      sc?.score, sc?.score_label, sc?.duplicate_detected, sc?.demo_count,
      Array.isArray(sc?.flags) ? (sc.flags as string[]).join('; ') : sc?.flags,
    ].map(esc).join(',');
  });

  const csv = [HEADERS.map(esc).join(','), ...lines].join('\n');
  const date = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-${label ?? 'all'}-${date}.csv"`,
    },
  });
}
