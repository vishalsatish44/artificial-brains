import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
  const [
    totalBookings,
    scoredLeads,
    demosScheduled,
    enrollments,
    highLeads,
    moderateLeads,
    repeatedLeads,
  ] = await Promise.all([
    supabase.from('demo_bookings').select('id', { count: 'exact', head: true }),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }),
    supabase.from('demo_schedules').select('id', { count: 'exact', head: true }),
    supabase.from('after_sales').select('id', { count: 'exact', head: true }),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('score_label', 'High'),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('score_label', 'Moderate'),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('score_label', 'Repeated'),
  ]);

  const total     = totalBookings.count ?? 0;
  const scored    = scoredLeads.count ?? 0;
  const scheduled = demosScheduled.count ?? 0;
  const enrolled  = enrollments.count ?? 0;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return NextResponse.json({
    ok: true,
    pipeline: [
      { stage: 'Demo Booked',    count: total,     pct: 100,        color: '#3b82f6' },
      { stage: 'AI Scored',      count: scored,    pct: pct(scored),    color: '#6366f1' },
      { stage: 'Demo Scheduled', count: scheduled, pct: pct(scheduled), color: '#f59e0b' },
      { stage: 'Enrolled',       count: enrolled,  pct: pct(enrolled),  color: '#10b981' },
    ],
    scoreBreakdown: {
      high:     highLeads.count ?? 0,
      moderate: moderateLeads.count ?? 0,
      repeated: repeatedLeads.count ?? 0,
    },
    conversionRate: total > 0 ? ((enrolled / total) * 100).toFixed(1) : '0.0',
  });
}
