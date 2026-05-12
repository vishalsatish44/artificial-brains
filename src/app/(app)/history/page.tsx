'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import { LeadDrawer } from '@/components/LeadDrawer';
import { useApi } from '@/hooks/useApi';
import { FilterBar, EMPTY_FILTERS, buildFilterParams, type FilterState, type FilterOptions } from '@/components/FilterBar';
import {
  AlertTriangle, CheckCircle2, Clock,
  Search, ChevronDown, ChevronLeft, ChevronRight, Download, SlidersHorizontal, MessageSquare, Sparkles, Loader2,
} from 'lucide-react';

const PAGE_SIZE = 50;

type ApiLead = {
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
  ai_lead_scores: Array<{
    score: number;
    score_label: string;
    duplicate_detected: boolean;
    demo_count: number;
    flags: string[];
  }> | null;
};

type ScoreLabelKey = 'High' | 'Moderate' | 'Repeated' | 'All';
const LABEL_OPTS: ScoreLabelKey[] = ['All', 'High', 'Moderate', 'Repeated'];

const labelCfg = (label: string) => {
  switch (label) {
    case 'High':     return { bg: '#ecfdf5', color: '#10b981', Icon: CheckCircle2 };
    case 'Repeated': return { bg: '#fef2f2', color: '#ef4444', Icon: AlertTriangle };
    default:         return { bg: '#fffbeb', color: '#f59e0b', Icon: Clock };
  }
};

function pageWindows(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | '…')[] = [0];
  if (current > 2) pages.push('…');
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
  if (current < total - 3) pages.push('…');
  pages.push(total - 1);
  return pages;
}

function PaginationBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ minWidth: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: '0.8rem', fontWeight: active ? 700 : 500, padding: '0 6px', background: active ? 'var(--foreground)' : 'var(--surface)', color: active ? 'var(--surface)' : disabled ? 'var(--muted-foreground)' : 'var(--foreground)', border: `1px solid ${active ? 'var(--foreground)' : 'var(--border-strong)'}`, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'all 0.12s ease' }}>
      {children}
    </button>
  );
}

// Inline WhatsApp send button for each row
function WaSendBtn({ lead }: { lead: ApiLead }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const demoDate  = lead.demo_datetime_cx ? new Date(lead.demo_datetime_cx) : null;
  const dateStr   = demoDate ? demoDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
  const timeStr   = demoDate ? demoDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'TBD';
  const agentName = lead.presales_agent_name?.[0] ?? 'Super Sheldon Team';
  const phone     = lead.whatsapp_contact ?? lead.student_contact ?? '';
  const guardian  = lead.guardian_name ?? lead.student_name ?? 'Sir/Ma\'am';
  const student   = lead.student_name ?? 'your child';

  const send = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone || status !== 'idle') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'whatsapp',
          phone,
          name: guardian,
          templateName: 'parent_demo_reminder',
          variables: [guardian, student, dateStr, timeStr, 'N/A', agentName],
          demoBookingId: lead.id,
        }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }, [phone, guardian, student, dateStr, timeStr, agentName, lead.id, status]);

  const color = status === 'sent' ? '#10b981' : status === 'error' ? '#ef4444' : '#25d366';
  const label = status === 'sending' ? '…' : status === 'sent' ? '✓' : status === 'error' ? '✗' : '';

  return (
    <button
      onClick={send}
      title={status === 'sent' ? 'Reminder sent' : status === 'error' ? 'Send failed' : 'Send demo reminder via WhatsApp'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${color}15`, color, border: `1px solid ${color}40`, borderRadius: 8, padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, cursor: status === 'idle' || status === 'error' ? 'pointer' : 'default', transition: 'all 0.15s' }}
    >
      <MessageSquare size={11} />
      {label || 'Remind'}
    </button>
  );
}

export default function HistoryPage() {
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState<ScoreLabelKey>('All');
  const [page, setPage]                 = useState(0);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [filters, setFilters]           = useState<FilterState>(EMPTY_FILTERS);
  const [nlQuery, setNlQuery]           = useState('');
  const [nlLoading, setNlLoading]       = useState(false);

  // Debounce search input → server-side search param
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: filterOpts } = useApi<{ ok: boolean } & FilterOptions>('/api/filter-options');

  function patchFilter(patch: Partial<FilterState>) { setFilters((f) => ({ ...f, ...patch })); setPage(0); }
  function resetFilters() { setFilters(EMPTY_FILTERS); setPage(0); }

  const labelParam  = filter !== 'All' ? `&label=${filter}` : '';
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  const filterParams = buildFilterParams(filters);
  const extraParams  = Object.entries(filterParams).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('');
  const url = `/api/leads?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${labelParam}${searchParam}${extraParams}`;

  const { data, loading } = useApi<{ ok: boolean; data: ApiLead[]; count: number | null }>(url);

  const total      = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from       = page * PAGE_SIZE + 1;
  const to         = Math.min((page + 1) * PAGE_SIZE, total);
  const leads      = data?.data ?? [];

  function goTo(p: number) {
    if (p < 0 || p >= totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function changeFilter(f: ScoreLabelKey) { setFilter(f); setPage(0); }

  const activeCount = Object.values(filters).filter(Boolean).length;

  async function applyNlFilter() {
    const q = nlQuery.trim();
    if (!q || nlLoading) return;
    setNlLoading(true);
    try {
      const res  = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'filter', query: q, options: filterOpts }),
      });
      const json = await res.json();
      if (json.ok && json.filterState) {
        setFilters((f) => ({ ...f, ...json.filterState }));
        setFiltersOpen(true);
        setPage(0);
      }
    } finally { setNlLoading(false); }
  }

  const csvParams = new URLSearchParams();
  if (filter !== 'All') csvParams.set('label', filter);
  if (search) csvParams.set('search', search);
  Object.entries(filterParams).forEach(([k, v]) => csvParams.set(k, v));
  const csvUrl = `/api/export?${csvParams.toString()}`;

  return (
    <div className="animate-fade-in">
      <TopBar searchPlaceholder="Search demo history…" />
      <LeadDrawer bookingId={activeId} onClose={() => setActiveId(null)} />

      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>Demo History</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Full record of all demo bookings with AI quality scores</p>
      </div>

      {/* Tabs + search + export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
        {LABEL_OPTS.map((opt) => (
          <button key={opt} onClick={() => changeFilter(opt)} style={{ padding: '0.5rem 1rem', borderRadius: 10, fontWeight: 600, fontSize: '0.8rem', background: filter === opt ? 'var(--foreground)' : 'var(--surface)', color: filter === opt ? 'var(--surface)' : 'var(--muted)', border: `1px solid ${filter === opt ? 'var(--foreground)' : 'var(--border-strong)'}`, cursor: 'pointer' }}>
            {opt}
          </button>
        ))}

        <button className="btn-ghost" onClick={() => setFiltersOpen((o) => !o)} style={{ gap: '0.5rem', marginLeft: 4, position: 'relative' }}>
          <SlidersHorizontal size={14} />
          Filters
          {activeCount > 0 && (
            <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, padding: '0 5px', position: 'absolute', top: -6, right: -6 }}>{activeCount}</span>
          )}
        </button>

        <div className="card" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: 10 }}>
          <Search size={14} color="var(--muted-foreground)" />
          <input
            type="text"
            placeholder="Search name, phone, email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', width: 220 }}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: '0.8rem', padding: 0 }}>✕</button>
          )}
        </div>

        <a href={csvUrl} download className="btn-ghost" style={{ gap: '0.5rem', textDecoration: 'none' }} title="Download CSV">
          <Download size={14} /> Export CSV
        </a>
      </div>

      {filtersOpen && (
        <div className="card" style={{ padding: '0.875rem 1rem', marginBottom: '0.875rem' }}>
          <FilterBar filters={filters} options={filterOpts ?? null} onChange={patchFilter} onReset={resetFilters} />
        </div>
      )}

      {/* AI Natural-Language Filter */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: 10, marginBottom: '0.875rem' }}>
        <Sparkles size={14} color="#6366f1" style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder='AI filter — e.g. "Grade 10 students from UAE booked last week"'
          value={nlQuery}
          onChange={(e) => setNlQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyNlFilter(); }}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', color: 'var(--foreground)' }}
        />
        <button
          onClick={applyNlFilter}
          disabled={!nlQuery.trim() || nlLoading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#6366f1', color: '#fff', border: 'none',
            borderRadius: 7, padding: '0.3rem 0.625rem',
            fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', opacity: nlLoading ? 0.6 : 1,
          }}
        >
          {nlLoading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {nlLoading ? 'Parsing…' : 'Apply'}
        </button>
        {activeCount > 0 && (
          <button onClick={resetFilters} style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear filters</button>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Table */}
      <div className="card-lg" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Parent / Student', 'Contact', 'Subject', 'Grade', 'Demo Date', 'Source', 'Agent', 'Demos', 'AI Score', 'WA', ''].map((h) => (
                <th key={h} style={{ padding: '0.875rem 1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 11 }).map((__, j) => (
                  <td key={j} style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ height: 16, background: '#f1f5f9', borderRadius: 6, width: j === 0 ? 120 : 60 }} />
                  </td>
                ))}</tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                  {data ? 'No records match — try a different filter.' : 'Loading…'}
                </td>
              </tr>
            ) : leads.map((l) => {
              const scoreRow = l.ai_lead_scores?.[0];
              const cfg = scoreRow ? labelCfg(scoreRow.score_label) : labelCfg('Moderate');
              const { Icon } = cfg;
              return (
                <tr
                  key={l.id}
                  onClick={() => setActiveId(l.id)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--background)'}
                  onMouseOut={(e) => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{l.guardian_name ?? l.student_name ?? '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{l.student_name} · {[l.city, l.country].filter(Boolean).join(', ') || '—'}</div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{l.student_contact ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem' }}>{l.demo_subject ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{l.grade ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {l.demo_datetime_cx ? new Date(l.demo_datetime_cx).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{l.lead_source ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{l.presales_agent_name?.[0] ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontWeight: 700, color: (scoreRow?.demo_count ?? 1) > 1 ? '#ef4444' : 'var(--foreground)', fontSize: '0.875rem' }}>
                      {scoreRow?.demo_count ?? 1}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {scoreRow ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                        <Icon size={12} /> {scoreRow.score_label} · {scoreRow.score}
                      </span>
                    ) : <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>Unscored</span>}
                  </td>
                  <td style={{ padding: '0.875rem 0.5rem' }} onClick={(e) => e.stopPropagation()}>
                    <WaSendBtn lead={l} />
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
            Showing {from}–{to} of {total.toLocaleString()} results
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <PaginationBtn onClick={() => goTo(page - 1)} disabled={page === 0}><ChevronLeft size={14} /></PaginationBtn>
            {pageWindows(page, totalPages).map((p, i) =>
              p === '…'
                ? <span key={`e${i}`} style={{ padding: '0 6px', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>…</span>
                : <PaginationBtn key={p} onClick={() => goTo(p as number)} active={p === page}>{(p as number) + 1}</PaginationBtn>
            )}
            <PaginationBtn onClick={() => goTo(page + 1)} disabled={page >= totalPages - 1}><ChevronRight size={14} /></PaginationBtn>
          </div>
        </div>
      )}
    </div>
  );
}
