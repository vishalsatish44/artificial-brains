import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const PAGE = 1000;

type FilterRow = {
  country: string | null;
  grade: string | null;
  demo_subject: string | null;
  lead_source: string | null;
  presales_agent_name: string[] | null;
};

export async function GET() {
  const rows: FilterRow[] = [];

  for (let page = 0; ; page++) {
    const { data } = await supabase
      .from('demo_bookings')
      .select('country, grade, demo_subject, lead_source, presales_agent_name')
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as FilterRow[]));
    if (data.length < PAGE) break;
  }

  const uniq = (arr: (string | null)[]): string[] =>
    [...new Set(arr.filter((v): v is string => !!v))].sort();

  const agentSet = new Set<string>();
  for (const r of rows) {
    for (const a of r.presales_agent_name ?? []) {
      if (a) agentSet.add(a);
    }
  }

  return NextResponse.json({
    ok: true,
    countries: uniq(rows.map((r) => r.country)),
    grades:    uniq(rows.map((r) => r.grade)).sort((a, b) => {
      const n = (s: string) => parseInt(s.replace(/\D/g, '') || '0', 10);
      return n(a) - n(b);
    }),
    subjects: uniq(rows.map((r) => r.demo_subject)),
    sources:  uniq(rows.map((r) => r.lead_source)),
    agents:   [...agentSet].sort(),
  });
}
