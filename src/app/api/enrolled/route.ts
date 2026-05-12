import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const sp      = new URL(req.url).searchParams;
  const limit   = parseInt(sp.get('limit')   ?? '50', 10);
  const offset  = parseInt(sp.get('offset')  ?? '0',  10);
  const subject = sp.get('subject');
  const agent   = sp.get('agent');
  const search  = sp.get('search');

  let query = supabase
    .from('after_sales')
    .select(`
      id,
      batch_id,
      subject_enrolled,
      sales_person_name,
      enrollment_date,
      type_of_enrollment,
      classes_included,
      payment_amount,
      currency,
      collection_inr,
      mode_of_payment,
      is_referral,
      onboarding_message_sent,
      demo_booking_id,
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
        presales_agent_name
      )
    `, { count: 'exact' })
    .order('enrollment_date', { ascending: false });

  if (subject) query = query.eq('subject_enrolled', subject);
  if (agent)   query = query.eq('sales_person_name', agent);

  // Server-side search: find matching demo_booking_ids first, then filter.
  // Doing this before .range() so count and pagination are correct.
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

    const { data: matchingBookings, error: bErr } = await supabase
      .from('demo_bookings')
      .select('id')
      .or(parts.join(','));

    if (bErr) return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 });

    const matchingIds = (matchingBookings ?? []).map((b) => b.id);
    if (matchingIds.length === 0) {
      return NextResponse.json({ ok: true, data: [], count: 0, totalRevenue: 0, referrals: 0 });
    }
    query = query.in('demo_booking_id', matchingIds);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = data ?? [];
  const totalRevenue = rows.reduce((s, r) => s + (r.collection_inr ?? 0), 0);
  const referrals    = rows.filter((r) => r.is_referral).length;

  return NextResponse.json({ ok: true, data: rows, count, totalRevenue, referrals });
}
