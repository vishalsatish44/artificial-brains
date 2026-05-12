'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, TrendingUp } from 'lucide-react';

type Props = {
  stats: Record<string, unknown>;
};

export function AiInsights({ stats }: Props) {
  const [insights, setInsights]   = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [fetched, setFetched]     = useState(false);

  async function fetchInsights() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insights', stats }),
      });
      const json = await res.json();
      if (json.ok) setInsights(json.insights ?? []);
      else setError(json.error ?? 'Failed');
    } catch {
      setError('Could not reach AI service.');
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Auto-fetch once stats are non-empty
  useEffect(() => {
    if (!fetched && Object.keys(stats).length > 0) fetchInsights();
  }, [stats]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #ecfdf5, #eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={15} color="#10b981" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>AI Insights</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>Powered by Gemini</div>
          </div>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="btn-ghost"
          style={{ gap: 4, padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
        >
          <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Analysing…' : 'Refresh'}
        </button>
      </div>

      {loading && !fetched && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[90, 75, 82].map((w, i) => (
            <div key={i} style={{ height: 40, background: '#f1f5f9', borderRadius: 8, width: `${w}%` }} />
          ))}
        </div>
      )}

      {error && (
        <div style={{ fontSize: '0.78rem', color: '#ef4444', background: '#fef2f2', padding: '0.625rem 0.875rem', borderRadius: 10 }}>
          {error}
        </div>
      )}

      {!loading && !error && insights.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {insights.map((insight, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '0.625rem 0.875rem',
              background: i === 0 ? '#ecfdf5' : i === 1 ? '#eff6ff' : '#fffbeb',
              borderRadius: 10,
              border: `1px solid ${i === 0 ? '#d1fae5' : i === 1 ? '#ddd6fe' : '#fde68a'}`,
            }}>
              <TrendingUp size={13} color={i === 0 ? '#10b981' : i === 1 ? '#6366f1' : '#f59e0b'} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--foreground)' }}>{insight}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && insights.length === 0 && fetched && (
        <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>No insights yet — try refreshing once data is loaded.</p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
