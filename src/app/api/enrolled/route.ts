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
    .order('enrollment_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (subject) query = query.eq('subject_enrolled', subject);
  if (agent)   query = query.eq('sales_person_name', agent);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Client-side search on joined booking fields (PostgREST can't .or across nested relations)
  let rows = data ?? [];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r) => {
      const b = r.demo_bookings as unknown as Record<string, unknown> | null;
      return (
        String(b?.student_name ?? '').toLowerCase().includes(q) ||
        String(b?.guardian_name ?? '').toLowerCase().includes(q) ||
        String(b?.student_contact ?? '').includes(q)
      );
    });
  }

  // Summary stats
  const totalRevenue = (data ?? []).reduce((s, r) => s + (r.collection_inr ?? 0), 0);
  const referrals    = (data ?? []).filter((r) => r.is_referral).length;

  return NextResponse.json({ ok: true, data: rows, count, totalRevenue, referrals });
}
