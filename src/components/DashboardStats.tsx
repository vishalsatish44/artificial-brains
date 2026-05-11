'use client';

import React from 'react';
import { Users, MessageSquare, CalendarCheck, FileText } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

type Stats = {
  stats: {
    totalLeads: number;
    highQualityLeads: number;
    repeatSeekers: number;
    moderateLeads: number;
    totalEnrollments: number;
    lastSynced: string | null;
    lastSyncStatus: string;
  };
};

const DashboardStats = () => {
  const { data, loading } = useApi<Stats>('/api/stats');
  const s = data?.stats;

  const cards = [
    {
      title:     'Total Leads',
      value:     s?.totalLeads ?? 0,
      sub:       'All time demo bookings',
      icon:      Users,
      iconBg:    '#eef2ff',
      iconColor: '#4f46e5',
      trendBg:   '#ecfdf5',
      trendColor:'#10b981',
    },
    {
      title:     'Active Conversations',
      value:     s?.moderateLeads ?? 0,
      sub:       'Moderate quality leads',
      icon:      MessageSquare,
      iconBg:    '#f3e8ff',
      iconColor: '#9333ea',
      trendBg:   '#f3e8ff',
      trendColor:'#9333ea',
    },
    {
      title:     'Repeat Demo Seekers',
      value:     s?.repeatSeekers ?? 0,
      sub:       'Duplicate detected',
      icon:      CalendarCheck,
      iconBg:    '#fce7f3',
      iconColor: '#db2777',
      trendBg:   '#fce7f3',
      trendColor:'#db2777',
    },
    {
      title:     'Total Enrollments',
      value:     s?.totalEnrollments ?? 0,
      sub:       'After-sales conversions',
      icon:      FileText,
      iconBg:    '#fef3c7',
      iconColor: '#d97706',
      trendBg:   '#fef3c7',
      trendColor:'#d97706',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.title} className="card-lg" style={{ padding: '1.25rem 1.25rem 1.1rem', minHeight: 168 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: c.iconBg, color: c.iconColor,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Icon size={20} />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
              {c.title}
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              {loading ? (
                <span style={{ display: 'inline-block', width: 60, height: 28, background: '#f1f5f9', borderRadius: 6, verticalAlign: 'middle' }} />
              ) : c.value.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
