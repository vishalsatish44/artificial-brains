'use client';

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

type Props = {
  title: string;
  metric: string | number;
  trend: number;
  variant: 'bars' | 'area';
  trendLabel?: string;
  monthLabels?: string[];
  chartData?: number[];
  loading?: boolean;
};

const ChannelEngagement = ({ title, metric, trend, variant, trendLabel, monthLabels, chartData, loading }: Props) => {
  const TrendIcon = trend >= 0 ? ArrowUp : ArrowDown;
  const trendColor = trend >= 0 ? '#10b981' : '#ef4444';

  return (
    <div className="card-lg" style={{ padding: '1.1rem 1.1rem 0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{title}</h3>
      </div>

      <div style={{ marginTop: '0.875rem', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {loading ? (
            <span style={{ display: 'inline-block', width: 60, height: 28, background: '#f1f5f9', borderRadius: 6, verticalAlign: 'middle' }} />
          ) : metric}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: trendColor, fontSize: '0.75rem', fontWeight: 600, paddingBottom: 4 }}>
          <TrendIcon size={12} />
          {trendLabel ?? `${trend > 0 ? '+' : ''}${trend}%`}
        </span>
      </div>

      <div style={{ marginTop: '0.5rem', height: 86 }}>
        {variant === 'bars'
          ? <Bars values={chartData} loading={loading} />
          : <Area values={chartData} loading={loading} />
        }
      </div>

      {monthLabels && monthLabels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${monthLabels.length}, 1fr)`, marginTop: 6 }}>
          {monthLabels.map((l) => (
            <span key={l} style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const Bars = ({ values, loading }: { values?: number[]; loading?: boolean }) => {
  const data = values && values.length > 0 ? values : [0];
  const max = Math.max(...data, 1);
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(9, 1fr)`, gap: 6, alignItems: 'end', height: '100%' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ height: `${20 + i * 8}%`, background: '#e0e7ff', borderRadius: 4 }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 6, alignItems: 'end', height: '100%' }}>
      {data.map((v, i) => {
        const isPeak = v === max;
        return (
          <div key={i} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
            {isPeak && v > 0 && (
              <div style={{
                position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.6rem', fontWeight: 700, background: '#1d4ed8', color: '#fff',
                borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap',
              }}>
                {v}
              </div>
            )}
            <div style={{
              width: '100%',
              height: `${Math.max((v / max) * 100, v > 0 ? 4 : 0)}%`,
              background: isPeak ? '#1d4ed8' : '#e0e7ff',
              borderRadius: 4,
            }} />
          </div>
        );
      })}
    </div>
  );
};

const Area = ({ values, loading }: { values?: number[]; loading?: boolean }) => {
  const data = values && values.length > 0 ? values : [0, 0];
  const w = 280;
  const h = 86;
  const max = Math.max(...data, 1);
  const min = 0;
  const range = max - min;
  const step = data.length > 1 ? w / (data.length - 1) : 0;

  if (loading) {
    return <div style={{ height: h, background: '#f0f4ff', borderRadius: 6 }} />;
  }

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const fillPath = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#area-fill)" />
      <path d={path} fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

export default ChannelEngagement;
