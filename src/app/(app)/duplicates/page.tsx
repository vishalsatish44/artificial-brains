'use client';

import React, { useState } from 'react';
import TopBar from '@/components/TopBar';
import { LeadDrawer } from '@/components/LeadDrawer';
import { useApi } from '@/hooks/useApi';
import { AlertTriangle, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;
const MIN_DEMO_OPTS = [2, 3, 4, 5, 6, 10];

// New shape: booking fields at top level, ai_lead_scores nested as single object
type ScoreInfo = {
  id: string;
  score: number;
  score_label: string;
  demo_count: number;
  flags: string[];
  alert_sent_to_team: boolean;
  reminder_sent_to_parent: boolean;
  scored_at: string | null;
  duplicate_detected: boolean;
};

type DuplicateRow = {
  id: string;
  student_name: string | null;
  guardian_name: string | null;
  student_contact: string | null;
  whatsapp_contact: string | null;
  student_email: string | null;
  country: string | null;
  city: string | null;
  grade: string | null;
  demo_subject: string | null;
  demo_datetime_cx: string | null;
  lead_source: string | null;
  presales_agent_name: string[] | null;
  form_filled_at: string | null;
  ai_lead_scores: ScoreInfo | null;
};

type ApiResp = { ok: boolean; data: DuplicateRow[]; count: number | null; error?: string };

function pageWindows(cur: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | '…')[] = [0];
  if (cur > 2) pages.push('…');
  for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) pages.push(i);
  if (cur < total - 3) pages.push('…');
  pages.push(total - 1);
  return pages;
}

export default function DuplicatesPage() {
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [minDemos, setMinDemos] = useState(2);

  function changeMin(v: number) { setMinDemos(v); setPage(0); }

  const url = `/api/duplicates?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}&min_demos=${minDemos}`;
  const { data, loading } = useApi<ApiResp>(url);

  const total      = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from       = page * PAGE_SIZE + 1;
  const to         = Math.min((page + 1) * PAGE_SIZE, total);

  const rows = (data?.data ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.student_name?.toLowerCase().includes(q) ||
      r.guardian_name?.toLowerCase().includes(q) ||
      r.student_contact?.includes(q)
    );
  });

  function goTo(p: number) {
    if (p < 0 || p >= totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const allRows = data?.data ?? [];

  return (
    <div className="animate-fade-in">
      <TopBar searchPlaceholder="Search duplicates…" />
      <LeadDrawer bookingId={activeId} onClose={() => setActiveId(null)} />

      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>Duplicate Lead Console</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          All leads flagged as repeat demo seekers by the AI scoring engine
        </p>
      </div>

      {/* API error banner */}
      {data?.error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#ef4444' }}>
          API error: {data.error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Duplicates', value: total,                                                                      color: '#ef4444' },
          { label: 'Reminders Sent',   value: allRows.filter(r => r.ai_lead_scores?.reminder_sent_to_parent).length,      color: '#10b981' },
          { label: 'Team Alerts Sent', value: allRows.filter(r => r.ai_lead_scores?.alert_sent_to_team).length,           color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>
                {loading ? '—' : s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: 10 }}>
          <Search size={14} color="var(--muted-foreground)" />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', width: 210 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>Min demos:</span>
          {MIN_DEMO_OPTS.map((v) => (
            <button key={v} onClick={() => changeMin(v)} style={{
              minWidth: 36, height: 32, borderRadius: 8, fontSize: '0.8rem',
              fontWeight: minDemos === v ? 700 : 500,
              background: minDemos === v ? 'var(--foreground)' : 'var(--surface)',
              color: minDemos === v ? 'var(--surface)' : 'var(--foreground)',
              border: `1px solid ${minDemos === v ? 'var(--foreground)' : 'var(--border-strong)'}`,
              cursor: 'pointer',
            }}>
              {v}+
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-lg" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Parent / Student', 'Contact', 'Subject', 'Last Demo', 'Source', 'Demo Count', 'AI Score', 'Alerts', ''].map((h) => (
                <th key={h} style={{ padding: '0.875rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ height: 16, background: '#f1f5f9', borderRadius: 6, width: j === 0 ? 120 : 60 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                  {data?.ok === false
                    ? `Error loading data — check console`
                    : `No duplicates found with ${minDemos}+ demos. Try lowering the min demos filter.`}
                </td>
              </tr>
            ) : rows.map((r) => {
              const sc = r.ai_lead_scores;
              return (
                <tr
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--background)'}
                  onMouseOut={(e) => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.guardian_name ?? r.student_name ?? '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                      {r.student_name} · {[r.city, r.country].filter(Boolean).join(', ') || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{r.student_contact ?? r.whatsapp_contact ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem' }}>{r.demo_subject ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {r.demo_datetime_cx ? new Date(r.demo_datetime_cx).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{r.lead_source ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>{sc?.demo_count ?? '—'}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}> demos</span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {sc ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef2f2', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                        <AlertTriangle size={11} /> {sc.score_label} · {sc.score}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {sc?.alert_sent_to_team && (
                        <span style={{ fontSize: '0.65rem', background: '#eff6ff', color: '#3b82f6', padding: '0.15rem 0.4rem', borderRadius: 999, fontWeight: 600 }}>Team ✓</span>
                      )}
                      {sc?.reminder_sent_to_parent && (
                        <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#10b981', padding: '0.15rem 0.4rem', borderRadius: 999, fontWeight: 600 }}>Parent ✓</span>
                      )}
                      {!sc?.alert_sent_to_team && !sc?.reminder_sent_to_parent && (
                        <span style={{ fontSize: '0.65rem', background: '#fffbeb', color: '#f59e0b', padding: '0.15rem 0.4rem', borderRadius: 999, fontWeight: 600 }}>Pending</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <ChevronDown size={14} color="var(--muted-foreground)" style={{ transform: 'rotate(-90deg)' }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0 0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            Showing {from}–{to} of {total.toLocaleString()} duplicates
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => goTo(page - 1)} disabled={page === 0} className="btn-ghost" style={{ padding: '0.375rem 0.625rem' }}>
              <ChevronLeft size={14} />
            </button>
            {pageWindows(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} style={{ padding: '0 6px', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>…</span>
              ) : (
                <button key={p} onClick={() => goTo(p as number)} style={{
                  minWidth: 32, height: 32, borderRadius: 8, fontSize: '0.8rem',
                  fontWeight: p === page ? 700 : 500,
                  background: p === page ? 'var(--foreground)' : 'var(--surface)',
                  color: p === page ? 'var(--surface)' : 'var(--foreground)',
                  border: `1px solid ${p === page ? 'var(--foreground)' : 'var(--border-strong)'}`,
                  cursor: 'pointer',
                }}>
                  {(p as number) + 1}
                </button>
              )
            )}
            <button onClick={() => goTo(page + 1)} disabled={page >= totalPages - 1} className="btn-ghost" style={{ padding: '0.375rem 0.625rem' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
