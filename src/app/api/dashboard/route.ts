import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET() {
  const now = new Date();

  const yearAgo = new Date(now);
  yearAgo.setFullYear(now.getFullYear() - 1);

  const [bookingRows, notifRows] = await Promise.all([
    supabase
      .from('demo_bookings')
      .select('form_filled_at')
      .gte('form_filled_at', yearAgo.toISOString())
      .not('form_filled_at', 'is', null),
    supabase
      .from('notifications_log')
      .select('channel, status, created_at'),
  ]);

  const rows = bookingRows.data ?? [];

  // Day-of-week distribution (Mon=1 through Sun=0 in JS)
  const dowCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const row of rows) {
    const d = new Date(row.form_filled_at!);
    dowCounts[d.getDay()] = (dowCounts[d.getDay()] ?? 0) + 1;
  }
  // Return Mon–Sun order
  const dayOfWeek = [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
    label: DAY_LABELS[dow],
    value: dowCounts[dow] ?? 0,
  }));

  // Monthly trend — last 12 months
  const monthSlots: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthSlots.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const monthMap: Record<string, number> = Object.fromEntries(monthSlots.map((k) => [k, 0]));
  for (const row of rows) {
    if (!row.form_filled_at) continue;
    const d = new Date(row.form_filled_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in monthMap) monthMap[key]++;
  }
  const monthlyTrend = monthSlots.map((key) => ({
    label: MONTH_LABELS[parseInt(key.split('-')[1], 10) - 1],
    value: monthMap[key],
  }));

  // Notification channel stats (all time)
  const notifs = notifRows.data ?? [];
  const whatsappTotal = notifs.filter((n) => n.channel === 'whatsapp').length;
  const whatsappSent  = notifs.filter((n) => n.channel === 'whatsapp' && n.status === 'sent').length;

  // Monthly notification counts for sparklines (last 9 months)
  const last9 = monthSlots.slice(-9);
  const waMonthly: number[] = last9.map(() => 0);
  for (const n of notifs) {
    if (!n.created_at || n.channel !== 'whatsapp') continue;
    const d = new Date(n.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const idx = last9.indexOf(key);
    if (idx >= 0) waMonthly[idx]++;
  }

  // Scoring coverage: scored / total
  const [totalRes, scoredRes] = await Promise.all([
    supabase.from('demo_bookings').select('id', { count: 'exact', head: true }),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }),
  ]);
  const totalLeads  = totalRes.count ?? 0;
  const scoredLeads = scoredRes.count ?? 0;
  const coveragePct = totalLeads > 0 ? Math.round((scoredLeads / totalLeads) * 100) : 0;

  // Monthly coverage sparkline (scored bookings created in last 9 months)
  const { data: scoredRows } = await supabase
    .from('ai_lead_scores')
    .select('scored_at')
    .not('scored_at', 'is', null)
    .gte('scored_at', yearAgo.toISOString());
  const coverageMonthly: number[] = last9.map(() => 0);
  for (const r of scoredRows ?? []) {
    if (!r.scored_at) continue;
    const d = new Date(r.scored_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const idx = last9.indexOf(key);
    if (idx >= 0) coverageMonthly[idx]++;
  }

  return NextResponse.json({
    ok: true,
    dayOfWeek,
    monthlyTrend,
    whatsappNotifications: {
      total: whatsappTotal,
      sent: whatsappSent,
      monthly: waMonthly,
    },
    scoringCoverage: {
      pct: coveragePct,
      scored: scoredLeads,
      total: totalLeads,
      monthly: coverageMonthly,
    },
  });
}
