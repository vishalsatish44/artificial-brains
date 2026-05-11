'use client';

import React from 'react';
import TopBar from '@/components/TopBar';
import { useApi } from '@/hooks/useApi';
import { TrendingUp, Users, CheckCircle2, DollarSign, ArrowDown } from 'lucide-react';

type PipelineData = {
  ok: boolean;
  pipeline: { stage: string; count: number; pct: number; color: string }[];
  scoreBreakdown: { high: number; moderate: number; repeated: number };
  conversionRate: string;
};

const STAGE_ICONS = [Users, CheckCircle2, TrendingUp, DollarSign];

export default function PipelinePage() {
  const { data, loading } = useApi<PipelineData>('/api/pipeline');

  const pipeline      = data?.pipeline ?? [];
  const scoreBreakdown = data?.scoreBreakdown ?? { high: 0, moderate: 0, repeated: 0 };
  const total         = pipeline[0]?.count ?? 0;

  return (
    <div className="animate-fade-in">
      <TopBar searchPlaceholder="Pipeline" />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>Enrollment Pipeline</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Funnel from demo booking to enrollment — overall conversion rate
          </p>
        </div>
        {!loading && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>{data?.conversionRate}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Overall Conversion</div>
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className="card-lg" style={{ padding: '2rem', marginBottom: '1.25rem' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 80, background: '#f1f5f9', borderRadius: 12, marginBottom: 12 }} />
          ))
        ) : pipeline.map((stage, i) => {
          const Icon = STAGE_ICONS[i];
          const funnelWidth = `${Math.max(stage.pct, 10)}%`;
          const prevCount = i > 0 ? pipeline[i - 1].count : null;
          const dropOff = prevCount != null && prevCount > 0 ? prevCount - stage.count : null;
          const dropPct = dropOff != null && prevCount ? Math.round((dropOff / prevCount) * 100) : null;

          return (
            <div key={stage.stage}>
              {/* Drop-off indicator between stages */}
              {i > 0 && dropOff !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.375rem 0', justifyContent: 'center' }}>
                  <ArrowDown size={14} color="var(--muted-foreground)" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                    {dropOff.toLocaleString()} dropped ({dropPct}%)
                  </span>
                </div>
              )}

              {/* Stage bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: i < pipeline.length - 1 ? 0 : 0 }}>
                {/* Left label */}
                <div style={{ width: 150, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${stage.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} color={stage.color} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{stage.stage}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', paddingLeft: 34 }}>
                    {stage.pct}% of total
                  </div>
                </div>

                {/* Bar */}
                <div style={{ flex: 1, height: 52, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: funnelWidth, height: '100%',
                    background: `linear-gradient(90deg, ${stage.color}dd, ${stage.color}88)`,
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', paddingLeft: '1rem',
                    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                  }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Score breakdown cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {[
          { label: 'High Quality',  count: scoreBreakdown.high,     color: '#10b981', bg: '#ecfdf5', pct: total > 0 ? Math.round(scoreBreakdown.high / total * 100) : 0 },
          { label: 'Moderate',      count: scoreBreakdown.moderate, color: '#f59e0b', bg: '#fffbeb', pct: total > 0 ? Math.round(scoreBreakdown.moderate / total * 100) : 0 },
          { label: 'Repeat Seekers', count: scoreBreakdown.repeated, color: '#ef4444', bg: '#fef2f2', pct: total > 0 ? Math.round(scoreBreakdown.repeated / total * 100) : 0 },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>
                {loading ? '—' : s.count.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', paddingBottom: 3 }}>
                {loading ? '' : `${s.pct}%`}
              </div>
            </div>
            {!loading && (
              <div style={{ marginTop: 10, height: 4, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 999 }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
