'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, X, Send, ChevronDown, Loader2 } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

// Max messages sent to the API — keeps token usage bounded (no context drift)
const MAX_HISTORY = 20;

const PAGE_LABELS: Record<string, string> = {
  '/':              'Dashboard — stats, WhatsApp notifications, scoring coverage',
  '/leads':         'Leads Management — kanban board of all leads by AI score label',
  '/history':       'Demo History — full table of all demo bookings with AI scores',
  '/duplicates':    'Duplicate Lead Console — repeat demo seekers with min-demos filter',
  '/enrolled':      'Enrolled Customers — students who converted and paid',
  '/analytics':     'Analytics — score distribution, source breakdown, agent performance, weekly trend',
  '/pipeline':      'Pipeline & Funnel — conversion funnel from booking to enrollment',
  '/notifications': 'Notification Center — WhatsApp and Slack notification log',
};

export function AiChat() {
  const pathname = usePathname();
  const [open, setOpen]           = useState(false);
  const [input, setInput]         = useState('');
  const [messages, setMessages]   = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Fetch live data whenever the chat opens — gives Gemini real numbers to answer from
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/stats').then((r) => r.json()).catch(() => null),
      fetch('/api/analytics').then((r) => r.json()).catch(() => null),
      fetch('/api/pipeline').then((r) => r.json()).catch(() => null),
      // Fetch duplicate counts for every threshold
      ...([2, 3, 4, 5, 6, 10] as const).map((n) =>
        fetch(`/api/duplicates?limit=1&min_demos=${n}`).then((r) => r.json()).catch(() => null)
      ),
    ]).then(([stats, analytics, pipeline, d2, d3, d4, d5, d6, d10]) => {
      if (!stats) return;
      const dupeCounts: Record<number, number> = {
        2: d2?.count ?? 0, 3: d3?.count ?? 0, 4: d4?.count ?? 0,
        5: d5?.count ?? 0, 6: d6?.count ?? 0, 10: d10?.count ?? 0,
      };

      const lines: string[] = ['=== LIVE DATA SNAPSHOT (from database) ===', ''];

      // Overview
      lines.push('OVERVIEW:');
      lines.push(`- Total demo bookings: ${stats.total ?? '—'}`);
      lines.push(`- AI scored: ${analytics?.totals?.scored ?? '—'} (${
        stats.total > 0 ? Math.round(((analytics?.totals?.scored ?? 0) / stats.total) * 100) : '—'
      }% coverage)`);
      lines.push(`- Enrolled / converted students: ${pipeline?.pipeline?.find((s: {stage:string}) => s.stage === 'Enrolled')?.count ?? '—'}`);
      lines.push(`- Overall conversion rate: ${pipeline?.conversionRate ?? '—'}%`);
      lines.push('');

      // Lead quality
      lines.push('LEAD QUALITY (AI scores):');
      lines.push(`- High quality leads: ${stats.high ?? '—'}`);
      lines.push(`- Moderate leads: ${stats.moderate ?? '—'}`);
      lines.push(`- Repeated / duplicate seekers: ${stats.repeated ?? '—'}`);
      lines.push(`- Unscored leads: ${stats.unscored ?? '—'}`);
      lines.push(`- Duplicate demo seekers breakdown by threshold:`);
      lines.push(`  • ≥2 demos: ${dupeCounts[2]}`);
      lines.push(`  • ≥3 demos: ${dupeCounts[3]}`);
      lines.push(`  • ≥4 demos: ${dupeCounts[4]}`);
      lines.push(`  • ≥5 demos: ${dupeCounts[5]}`);
      lines.push(`  • ≥6 demos: ${dupeCounts[6]}`);
      lines.push(`  • ≥10 demos: ${dupeCounts[10]}`);
      lines.push('');

      // Pipeline funnel
      if (pipeline?.pipeline) {
        lines.push('PIPELINE FUNNEL:');
        for (const s of pipeline.pipeline) {
          lines.push(`- ${s.stage}: ${s.count} (${s.pct}%)`);
        }
        lines.push('');
      }

      // Agent performance
      if (analytics?.agentPerformance?.length) {
        lines.push('AGENT PERFORMANCE (all agents):');
        for (const a of analytics.agentPerformance) {
          lines.push(`- ${a.agent}: ${a.total} leads, ${a.high} High (${a.highPct}%), ${a.repeated} Repeated (${a.repPct}%)`);
        }
        lines.push('');
      }

      // Top sources
      if (analytics?.sourceBreakdown?.length) {
        lines.push('TOP LEAD SOURCES:');
        for (const s of analytics.sourceBreakdown.slice(0, 8)) {
          lines.push(`- ${s.label}: ${s.count}`);
        }
        lines.push('');
      }

      // Top subjects
      if (analytics?.subjectDistribution?.length) {
        lines.push('TOP SUBJECTS:');
        for (const s of analytics.subjectDistribution.slice(0, 8)) {
          lines.push(`- ${s.label}: ${s.count}`);
        }
        lines.push('');
      }

      // Top countries
      if (analytics?.countryBreakdown?.length) {
        lines.push('TOP COUNTRIES:');
        for (const c of analytics.countryBreakdown.slice(0, 8)) {
          lines.push(`- ${c.label}: ${c.count}`);
        }
        lines.push('');
      }

      // Grade distribution
      if (analytics?.gradeDistribution?.length) {
        lines.push('GRADE DISTRIBUTION:');
        for (const g of analytics.gradeDistribution.slice(0, 10)) {
          lines.push(`- ${g.label}: ${g.count}`);
        }
      }

      setLiveSnapshot(lines.join('\n'));
    });
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: "Hi! I can answer questions about your leads, agents, or analytics. Try asking:\n• Which agent has the most repeated leads?\n• What's the trend in high-quality leads this month?\n• Explain how duplicate detection works",
        }]);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setStreaming(true);

    // append empty assistant message that we'll stream into
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          context: [
            `Current page: ${PAGE_LABELS[pathname] ?? pathname}`,
            liveSnapshot,
          ].filter(Boolean).join('\n\n'),
          messages: next.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const json = await res.json();
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: json.ok ? (json.text ?? '') : 'Sorry, something went wrong. Please try again.',
        };
        return copy;
      });
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, pathname, liveSnapshot]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  function clear() {
    setMessages([{
      role: 'assistant',
      content: "Cleared! What else would you like to know?",
    }]);
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="AI Assistant"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 500,
          width: 52, height: 52, borderRadius: 999,
          background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseOut={(e)  => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {open
          ? <ChevronDown size={22} color="#fff" />
          : <Sparkles size={22} color="#fff" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 28, zIndex: 499,
          width: 380, height: 520,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          boxShadow: '0 12px 48px rgba(15,23,42,0.14)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '0.875rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#10b981" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>AI Assistant</span>
              <span style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 600, background: '#eff6ff', padding: '0.1rem 0.4rem', borderRadius: 999 }}>Gemini 2.5</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={clear} style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem' }}>Clear</button>
              <button onClick={() => setOpen(false)} className="icon-btn" style={{ width: 26, height: 26, borderRadius: 7 }}><X size={14} /></button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #10b981, #6366f1)'
                    : 'var(--background)',
                  color: m.role === 'user' ? '#fff' : 'var(--foreground)',
                  fontSize: '0.82rem',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                }}>
                  {m.content}
                  {i === messages.length - 1 && streaming && m.role === 'assistant' && (
                    <span style={{ display: 'inline-block', width: 6, height: 12, background: '#10b981', marginLeft: 2, borderRadius: 1, animation: 'blink 0.8s step-end infinite', verticalAlign: 'middle' }} />
                  )}
                </div>
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.content === '' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything about your leads…"
              disabled={streaming}
              style={{
                flex: 1, border: '1px solid var(--border-strong)', borderRadius: 10,
                padding: '0.5rem 0.75rem', fontSize: '0.82rem',
                background: 'var(--background)', outline: 'none',
                color: 'var(--foreground)',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: !input.trim() || streaming ? 'var(--border)' : 'linear-gradient(135deg, #10b981, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin  { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
