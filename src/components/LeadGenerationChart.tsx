'use client';

import React from 'react';
import { useApi } from '@/hooks/useApi';

type DashboardData = {
  ok: boolean;
  monthlyTrend: { label: string; value: number }[];
};

const LeadGenerationChart = () => {
  const { data, loading } = useApi<DashboardData>('/api/dashboard');
  const points = data?.monthlyTrend ?? [];

  const w = 1100;
  const h = 280;
  const padX = 36;
  const padTop = 20;
  const padBottom = 30;
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min;
  const step = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0;

  const buildPath = (vals: number[]) => {
    if (vals.length === 0) return '';
    const pts = vals.map((v, i) => {
      const x = padX + i * step;
      const y = padTop + (1 - (v - min) / range) * (h - padTop - padBottom);
      return [x, y] as const;
    });
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const linePath = buildPath(values);
  const yMax = Math.ceil(max / 100) * 100;
  const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax];

  return (
    <div className="card-lg" style={{ padding: '1.25rem 1.25rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Monthly Booking Trend</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Legend color="#1d4ed8" label="Bookings per month" />
          <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>Last 12 months</span>
        </div>
      </div>

      <div style={{ width: '100%' }}>
        {loading ? (
          <div style={{ height: h, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
            Loading…
          </div>
        ) : (
          <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
            <defs>
              <pattern id="grid-stripes" width="14" height={h} patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="7" height={h} fill="#f0f4ff" opacity="0.4" />
              </pattern>
              <linearGradient id="line-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <rect x={padX} y={padTop} width={w - padX * 2} height={h - padTop - padBottom} fill="url(#grid-stripes)" />

            {yTicks.map((t) => {
              const y = padTop + (1 - (t - min) / range) * (h - padTop - padBottom);
              return (
                <g key={t}>
                  <line x1={padX} x2={w - padX} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />
                  <text x={padX - 8} y={y + 4} fontSize="11" fill="#94a3b8" textAnchor="end">{t}</text>
                </g>
              );
            })}

            {linePath && (
              <>
                <path d={`${linePath} L ${padX + (values.length - 1) * step} ${padTop + (h - padTop - padBottom)} L ${padX} ${padTop + (h - padTop - padBottom)} Z`} fill="url(#line-fill)" />
                <path d={linePath} fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinejoin="round" />
              </>
            )}

            {points.map((p, i) => {
              const x = padX + i * step;
              return (
                <text key={p.label} x={x} y={h - 8} fontSize="11" fill="#94a3b8" textAnchor="middle">
                  {p.label}
                </text>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--muted)' }}>
    <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }} />
    {label}
  </div>
);

export default LeadGenerationChart;
