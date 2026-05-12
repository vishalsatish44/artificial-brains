'use client';

import React from 'react';
import TopBar from '@/components/TopBar';
import DashboardStats from '@/components/DashboardStats';
import EngagementChart from '@/components/EngagementChart';
import ChannelEngagement from '@/components/ChannelEngagement';
import LeadGenerationChart from '@/components/LeadGenerationChart';
import { AiInsights } from '@/components/AiInsights';
import { useApi } from '@/hooks/useApi';

type DashboardResp = {
  ok: boolean;
  whatsappNotifications: { total: number; sent: number; monthly: number[] };
  scoringCoverage: { pct: number; scored: number; total: number; monthly: number[] };
};

type StatsResp = {
  ok: boolean;
  total: number;
  high: number;
  moderate: number;
  repeated: number;
  unscored: number;
};

export default function DashboardPage() {
  const { data, loading }       = useApi<DashboardResp>('/api/dashboard');
  const { data: statsData }     = useApi<StatsResp>('/api/stats');

  const last9Months = Array.from({ length: 9 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - 8 + i, 1);
    return d.toLocaleString('en', { month: 'short' });
  });

  const waTrend = (() => {
    const monthly = data?.whatsappNotifications.monthly ?? [];
    if (monthly.length < 2) return 0;
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    return prev ? Math.round(((last - prev) / Math.max(prev, 1)) * 100) : 0;
  })();

  const insightStats = statsData ? {
    totalBookings:    statsData.total,
    highQuality:      statsData.high,
    moderate:         statsData.moderate,
    repeated:         statsData.repeated,
    unscored:         statsData.unscored,
    whatsappSent:     data?.whatsappNotifications.total ?? 0,
    scoringCoverage:  `${data?.scoringCoverage.pct ?? 0}%`,
  } : {};

  return (
    <div className="animate-fade-in">
      <TopBar />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <DashboardStats />
        <EngagementChart />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <ChannelEngagement
          title="WhatsApp Notifications"
          metric={loading ? '…' : (data?.whatsappNotifications.total ?? 0)}
          trend={waTrend}
          variant="bars"
          trendLabel={`${waTrend >= 0 ? '+' : ''}${waTrend}% vs last month`}
          monthLabels={last9Months}
          chartData={data?.whatsappNotifications.monthly}
          loading={loading}
        />
        <ChannelEngagement
          title="Scoring Coverage"
          metric={loading ? '…' : `${data?.scoringCoverage.pct ?? 0}%`}
          trend={0}
          variant="area"
          trendLabel={`${data?.scoringCoverage.scored ?? 0} / ${data?.scoringCoverage.total ?? 0} scored`}
          monthLabels={last9Months}
          chartData={data?.scoringCoverage.monthly}
          loading={loading}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <LeadGenerationChart />
        <AiInsights stats={insightStats} />
      </div>
    </div>
  );
}
