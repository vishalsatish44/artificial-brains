'use client';

import React from 'react';
import { useApi } from '@/hooks/useApi';

type DashboardData = {
  ok: boolean;
  dayOfWeek: { label: string; value: number }[];
};

const EngagementChart = () => {
  const { data, loading } = useApi<DashboardData>('/api/dashboard');
  const bars = data?.dayOfWeek ?? [];
  const max  = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="card-lg" style={{ padding: '1.25rem 1.25rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Bookings by Day of Week</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
            Distribution over last 12 months
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, 1fr)`,
          gap: '0.875rem',
          alignItems: 'end',
          height: 180,
          marginTop: '1rem',
          padding: '0 0.25rem',
        }}
      >
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ height: `${30 + i * 8}%`, background: '#e0e7ff', borderRadius: 6 }} />
                </div>
                <span style={{ height: 12, width: 24, background: '#f1f5f9', borderRadius: 4 }} />
              </div>
            ))
          : bars.map((b) => {
              const pct = (b.value / max) * 100;
              return (
                <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        height: `${pct}%`,
                        background: 'linear-gradient(180deg, #10b981 0%, #1d4ed8 100%)',
                        borderTopLeftRadius: 6,
                        borderTopRightRadius: 6,
                        transition: 'height 0.4s ease',
                        minHeight: 4,
                        position: 'relative',
                      }}
                    >
                      {pct > 50 && (
                        <span style={{
                          position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                          fontSize: '0.6rem', fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap',
                        }}>
                          {b.value}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 500 }}>{b.label}</span>
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default EngagementChart;
