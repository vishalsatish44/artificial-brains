'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

type LeadInfo = {
  name: string;
  subject: string | null;
  grade: string | null;
  demoCount: number;
  lastDemo: string | null;
  source: string | null;
  score: number;
  label: string;
  alertsSent: string;
};

type Props = { lead: LeadInfo };

export function AiRecommend({ lead }: Props) {
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);

  const fetch_ = useCallback(async () => {
    if (loading) return;
    if (text) { setOpen((o) => !o); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res  = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recommend', lead }),
      });
      const json = await res.json();
      setText(json.ok ? json.text : 'Could not generate recommendation.');
    } catch {
      setText('Could not reach AI service.');
    } finally {
      setLoading(false);
    }
  }, [lead, loading, text]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={fetch_}
        title="Get AI recommendation"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: open ? '#eff6ff' : 'var(--surface)',
          color: '#6366f1',
          border: '1px solid #c7d2fe',
          borderRadius: 8, padding: '0.2rem 0.5rem',
          fontSize: '0.7rem', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {loading
          ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
          : <Sparkles size={10} />}
        {loading ? 'Thinking…' : 'AI Advice'}
      </button>

      {open && text && (
        <div style={{
          position: 'absolute', bottom: '110%', right: 0, zIndex: 50,
          width: 260,
          background: 'var(--surface)',
          border: '1px solid #c7d2fe',
          borderRadius: 12,
          padding: '0.75rem',
          boxShadow: '0 8px 24px rgba(99,102,241,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
            <Sparkles size={12} color="#6366f1" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366f1' }}>AI Recommendation</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--foreground)' }}>{text}</p>
          <button
            onClick={() => setOpen(false)}
            style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Dismiss
          </button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
