import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const PAGE = 1000;

async function fetchColumn(col: string): Promise<(string | null)[]> {
  const out: (string | null)[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabase
      .from('demo_bookings')
      .select(col)
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as Record<string, string | null>[]).map((r) => r[col] ?? null));
    if (data.length < PAGE) break;
  }
  return out;
}

function tally(values: (string | null)[]): { label: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const v of values) {
    const k = v ?? 'Unknown';
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

type AgentScoreRow = {
  presales_agent_name: string[] | null;
  ai_lead_scores: { score_label: string } | null;
};

export async function GET() {
  const [highRes, modRes, repRes, totalRes] = await Promise.all([
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('score_label', 'High'),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('score_label', 'Moderate'),
    supabase.from('ai_lead_scores').select('id', { count: 'exact', head: true }).eq('score_label', 'Repeated'),
    supabase.from('demo_bookings').select('id', { count: 'exact', head: true }),
  ]);

  const total    = totalRes.count ?? 0;
  const scored   = (highRes.count ?? 0) + (modRes.count ?? 0) + (repRes.count ?? 0);
  const unscored = total - scored;

  // Fetch columns for aggregation in parallel
  const [sources, countries, grades, subjects] = await Promise.all([
    fetchColumn('lead_source'),
    fetchColumn('country'),
    fetchColumn('grade'),
    fetchColumn('demo_subject'),
  ]);

  // Agent performance — fetch agent name + score label together
  const agentRows: AgentScoreRow[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabase
      .from('demo_bookings')
      .select('presales_agent_name, ai_lead_scores(score_label)')
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (!data || data.length === 0) break;
    agentRows.push(...(data as unknown as AgentScoreRow[]));
    if (data.length < PAGE) break;
  }

  type AgentStat = { total: number; high: number; moderate: number; repeated: number };
  const agentMap: Record<string, AgentStat> = {};

  for (const row of agentRows) {
    const agents = row.presales_agent_name?.length ? row.presales_agent_name : ['Unassigned'];
    const label  = (row.ai_lead_scores as { score_label?: string } | null)?.score_label ?? 'Unscored';
    for (const agent of agents) {
      if (!agentMap[agent]) agentMap[agent] = { total: 0, high: 0, moderate: 0, repeated: 0 };
      agentMap[agent].total++;
      if (label === 'High')     agentMap[agent].high++;
      else if (label === 'Moderate') agentMap[agent].moderate++;
      else if (label === 'Repeated') agentMap[agent].repeated++;
    }
  }

  const agentPerformance = Object.entries(agentMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 15)
    .map(([agent, s]) => ({
      agent,
      total:    s.total,
      high:     s.high,
      moderate: s.moderate,
      repeated: s.repeated,
      highPct:  s.total > 0 ? Math.round((s.high    / s.total) * 100) : 0,
      modPct:   s.total > 0 ? Math.round((s.moderate / s.total) * 100) : 0,
      repPct:   s.total > 0 ? Math.round((s.repeated / s.total) * 100) : 0,
    }));

  // Weekly trend — last 84 days
  const since = new Date();
  since.setDate(since.getDate() - 84);
  const { data: trendRows } = await supabase
    .from('demo_bookings')
    .select('form_filled_at')
    .gte('form_filled_at', since.toISOString())
    .order('form_filled_at', { ascending: true });

  const weekMap: Record<string, number> = {};
  for (const row of trendRows ?? []) {
    if (!row.form_filled_at) continue;
    const d   = new Date(row.form_filled_at);
    const sun = new Date(d);
    sun.setDate(d.getDate() - d.getDay());
    const key = sun.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    weekMap[key] = (weekMap[key] ?? 0) + 1;
  }
  const weeklyTrend = Object.entries(weekMap).map(([week, count]) => ({ week, count }));

  // Grade sort: numeric extraction (Year 1 → 1)
  const gradeDistribution = tally(grades).sort((a, b) => {
    const n = (s: string) => parseInt(s.replace(/\D/g, '') || '0', 10);
    return n(a.label) - n(b.label);
  });

  return NextResponse.json({
    ok: true,
    scoreDistribution: [
      { label: 'High',     count: highRes.count ?? 0, color: '#10b981' },
      { label: 'Moderate', count: modRes.count ?? 0,  color: '#f59e0b' },
      { label: 'Repeated', count: repRes.count ?? 0,  color: '#ef4444' },
      { label: 'Unscored', count: unscored,            color: '#94a3b8' },
    ],
    sourceBreakdown:    tally(sources).slice(0, 12),
    countryBreakdown:   tally(countries).slice(0, 10),
    gradeDistribution:  gradeDistribution.slice(0, 15),
    subjectDistribution: tally(subjects).slice(0, 12),
    agentPerformance,
    weeklyTrend,
    totals: { total, scored, unscored },
  });
}
