import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
  const [leads, highLeads, moderateLeads, repeatSeekers, afterSales, syncLog] = await Promise.all([
    supabase.from('demo_bookings').select('id', { count: 'exact', head: true }),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('score_label', 'High'),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('score_label', 'Moderate'),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('duplicate_detected', true),
    supabase.from('after_sales').select('id', { count: 'exact', head: true }),
    supabase
      .from('sync_logs')
      .select('completed_at, status')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    ok: true,
    stats: {
      totalLeads:        leads.count ?? 0,
      highQualityLeads:  highLeads.count ?? 0,
      repeatSeekers:     repeatSeekers.count ?? 0,
      moderateLeads:     moderateLeads.count ?? 0,
      totalEnrollments:  afterSales.count ?? 0,
      lastSynced:        syncLog.data?.completed_at ?? null,
      lastSyncStatus:    syncLog.data?.status ?? 'never',
    },
  });
}
