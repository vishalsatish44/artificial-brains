'use client';

import React from 'react';
import TopBar from '@/components/TopBar';
import { useApi } from '@/hooks/useApi';
import { BarChart2, TrendingUp, Globe, Layers, Users } from 'lucide-react';

type AgentStat = {
  agent: string; total: number; high: number; moderate: number; repeated: number;
  highPct: number; modPct: number; repPct: number;
};

type AnalyticsData = {
  ok: boolean;
  scoreDistribution:   { label: string; count: number; color: string }[];
  sourceBreakdown:     { label: string; count: number }[];
  countryBreakdown:    { label: string; count: number }[];
  gradeDistribution:   { label: string; count: number }[];
  subjectDistribution: { label: string; count: number }[];
  agentPerformance:    AgentStat[];
  weeklyTrend:         { week: string; count: number }[];
  totals:              { total: number; scored: number; unscored: number };
};

function HBar({ label, value, max, color, pct }: { label: string; value: number; max: number; color: string; pct?: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, 1) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
      <div style={{ width: 130, fontSize: '0.77rem', color: 'var(--foreground)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
        {label}
      </div>
      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ width: 64, fontSize: '0.77rem', fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>
        {value.toLocaleString()}
        {pct !== undefined && <span style={{ fontSize: '0.67rem', fontWeight: 400, color: 'var(--muted-foreground)', marginLeft: 3 }}>{pct}%</span>}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: { week: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150, paddingBottom: 22, position: 'relative' }}>
      {data.map((d, i) => {
        const h = Math.max((d.count / max) * 118, 3);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)', marginBottom: 2 }}>{d.count}</div>
            <div title={`${d.week}: ${d.count}`} style={{ width: '100%', height: h, background: 'var(--primary)', borderRadius: '4px 4px 0 0', opacity: 0.82, transition: 'height 0.4s ease' }} />
            <div style={{ fontSize: '0.59rem', color: 'var(--muted-foreground)', textAlign: 'center', position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.week}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonBlock({ h = 160 }: { h?: number }) {
  return <div style={{ height: h, background: '#f1f5f9', borderRadius: 10 }} />;
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={16} color="var(--primary)" /> {title}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, loading } = useApi<AnalyticsData>('/api/analytics');

  const totals    = data?.totals ?? { total: 0, scored: 0, unscored: 0 };
  const maxSource  = Math.max(...(data?.sourceBreakdown ?? []).map(d => d.count), 1);
  const maxCountry = Math.max(...(data?.countryBreakdown ?? []).map(d => d.count), 1);
  const maxGrade   = Math.max(...(data?.gradeDistribution ?? []).map(d => d.count), 1);
  const maxSubject = Math.max(...(data?.subjectDistribution ?? []).map(d => d.count), 1);

  return (
    <div className="animate-fade-in">
      <TopBar searchPlaceholder="Analytics" />

      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>Lead Analytics</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Breakdown of lead sources, quality scores, and booking trends</p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Bookings', value: totals.total,    color: '#3b82f6', Icon: BarChart2 },
          { label: 'AI Scored',      value: totals.scored,   color: '#6366f1', Icon: Layers },
          { label: 'Unscored',       value: totals.unscored, color: '#94a3b8', Icon: Layers },
          { label: 'Unique Sources', value: (data?.sourceBreakdown ?? []).length, color: '#10b981', Icon: TrendingUp },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.Icon size={16} color={s.color} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{loading ? '—' : s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Score distribution + Weekly trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <SectionCard title="Score Distribution" icon={Layers}>
          {loading ? <SkeletonBlock /> : (data?.scoreDistribution ?? []).map((s) => (
            <HBar key={s.label} label={s.label} value={s.count} max={Math.max(...(data?.scoreDistribution ?? []).map(d => d.count), 1)} color={s.color} pct={totals.total > 0 ? Math.round((s.count / totals.total) * 100) : 0} />
          ))}
        </SectionCard>

        <SectionCard title="Weekly Bookings (last 12 weeks)" icon={TrendingUp}>
          {loading ? <SkeletonBlock h={150} /> : (data?.weeklyTrend ?? []).length === 0
            ? <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>No data in the last 12 weeks</div>
            : <TrendChart data={data?.weeklyTrend ?? []} />}
        </SectionCard>
      </div>

      {/* Row 2: Lead Source + Countries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <SectionCard title="Lead Source Breakdown" icon={BarChart2}>
          {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ height: 18, background: '#f1f5f9', borderRadius: 6, marginBottom: 10, width: `${60 + i * 6}%` }} />)
            : (data?.sourceBreakdown ?? []).map((s) => (
              <HBar key={s.label} label={s.label} value={s.count} max={maxSource} color="#6366f1" pct={totals.total > 0 ? Math.round((s.count / totals.total) * 100) : 0} />
            ))}
        </SectionCard>

        <SectionCard title="Top Countries" icon={Globe}>
          {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ height: 18, background: '#f1f5f9', borderRadius: 6, marginBottom: 10, width: `${60 + i * 6}%` }} />)
            : (data?.countryBreakdown ?? []).map((c) => (
              <HBar key={c.label} label={c.label} value={c.count} max={maxCountry} color="#10b981" pct={totals.total > 0 ? Math.round((c.count / totals.total) * 100) : 0} />
            ))}
        </SectionCard>
      </div>

      {/* Row 3: Grade + Subject */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <SectionCard title="Grade Distribution" icon={BarChart2}>
          {loading ? <SkeletonBlock /> : (data?.gradeDistribution ?? []).map((g) => (
            <HBar key={g.label} label={g.label} value={g.count} max={maxGrade} color="#f59e0b" pct={totals.total > 0 ? Math.round((g.count / totals.total) * 100) : 0} />
          ))}
        </SectionCard>

        <SectionCard title="Subject Distribution" icon={BarChart2}>
          {loading ? <SkeletonBlock /> : (data?.subjectDistribution ?? []).map((s) => (
            <HBar key={s.label} label={s.label} value={s.count} max={maxSubject} color="#3b82f6" pct={totals.total > 0 ? Math.round((s.count / totals.total) * 100) : 0} />
          ))}
        </SectionCard>
      </div>

      {/* Row 4: Agent Performance */}
      <SectionCard title="Agent Performance" icon={Users}>
        {loading ? <SkeletonBlock h={300} /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Agent', 'Total Leads', 'High', 'Moderate', 'Repeated', 'Quality Score'].map((h) => (
                    <th key={h} style={{ padding: '0.625rem 0.875rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.agentPerformance ?? []).map((a) => (
                  <tr key={a.agent} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.625rem 0.875rem', fontWeight: 600 }}>{a.agent}</td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>{a.total.toLocaleString()}</td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{a.high}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginLeft: 4 }}>{a.highPct}%</span>
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>{a.moderate}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginLeft: 4 }}>{a.modPct}%</span>
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem' }}>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{a.repeated}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginLeft: 4 }}>{a.repPct}%</span>
                    </td>
                    <td style={{ padding: '0.625rem 0.875rem', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${a.highPct}%`, height: '100%', background: '#10b981', borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', width: 32, textAlign: 'right' }}>{a.highPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
