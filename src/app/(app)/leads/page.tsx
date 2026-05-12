'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Search, LayoutGrid, Plus, MoreHorizontal, ChevronDown, RefreshCw, SlidersHorizontal } from 'lucide-react';
import LeadCard, { type Lead } from '@/components/LeadCard';
import { LeadDrawer } from '@/components/LeadDrawer';
import TopBar from '@/components/TopBar';
import { useApi } from '@/hooks/useApi';
import { FilterBar, EMPTY_FILTERS, buildFilterParams, type FilterState, type FilterOptions } from '@/components/FilterBar';

const PAGE = 200;

type ApiLead = {
  id: string;
  student_name: string | null;
  guardian_name: string | null;
  student_contact: string | null;
  whatsapp_contact: string | null;
  student_email: string | null;
  country: string | null;
  city: string | null;
  country_code: string | null;
  grade: string | null;
  lead_source: string | null;
  demo_subject: string | null;
  demo_datetime_cx: string | null;
  prior_booking: string | null;
  trial_classes_already_taken: number | null;
  presales_agent_name: string[] | null;
  form_filled_at: string | null;
  ai_lead_scores: Array<{
    score: number;
    score_label: string;
    duplicate_detected: boolean;
    demo_count: number;
    flags: string[];
    alert_sent_to_team: boolean;
    reminder_sent_to_parent: boolean;
  }> | null;
};

const AVATAR_COLORS = ['green', 'pink', 'blue', 'purple', 'cyan', 'rose', 'amber', 'orange'];

function toInitials(name: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}

function mapToLead(a: ApiLead, idx: number): Lead {
  const score     = a.ai_lead_scores?.[0]?.score ?? 75;
  const agentName = a.presales_agent_name?.[0] ?? 'Unassigned';
  const location  = [a.city, a.country].filter(Boolean).join(', ') || 'Unknown';
  const phone     = [a.country_code, a.student_contact ?? a.whatsapp_contact].filter(Boolean).join(' ') || 'N/A';
  return {
    id:             a.id,
    parentName:     a.guardian_name ?? a.student_name ?? 'Unknown',
    studentName:    a.student_name ?? 'Unknown',
    phone, location,
    package:        a.demo_subject ?? 'General',
    email:          a.student_email ?? 'N/A',
    assigneeName:   agentName,
    assigneeAvatar: toInitials(agentName),
    score,
    bookedAt:       a.form_filled_at
      ? new Date(a.form_filled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A',
    avatarColor:    AVATAR_COLORS[idx % AVATAR_COLORS.length],
    initials:       toInitials(a.guardian_name ?? a.student_name),
  };
}

type ColDef = { id: string; title: string; dotColor: string; label: string };
const COLS: ColDef[] = [
  { id: 'fresh',  title: 'Fresh Leads',        dotColor: '#3b82f6', label: 'High' },
  { id: 'demo',   title: 'Demo Booked',         dotColor: '#10b981', label: 'Moderate' },
  { id: 'repeat', title: 'Repeat Demo Seekers', dotColor: '#ef4444', label: 'Repeated' },
];

const SkeletonCard = () => (
  <div className="card" style={{ padding: '0.95rem 1rem' }}>
    {[44, 28, 22, 18, 18].map((h, i) => (
      <div key={i} style={{ height: h, background: '#f1f5f9', borderRadius: 8, marginBottom: 12, width: i === 0 ? '60%' : '90%' }} />
    ))}
  </div>
);

function buildUrl(off: number, search: string, filters: FilterState): string {
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(off) });
  if (search) params.set('search', search);
  const fp = buildFilterParams(filters);
  Object.entries(fp).forEach(([k, v]) => params.set(k, v));
  return `/api/leads?${params.toString()}`;
}

export default function LeadsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters]         = useState<FilterState>(EMPTY_FILTERS);
  const [allLeads, setAllLeads]       = useState<ApiLead[]>([]);
  const [total, setTotal]             = useState(0);
  const [offset, setOffset]           = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing]         = useState(false);

  const { data: filterOpts } = useApi<{ ok: boolean } & FilterOptions>('/api/filter-options');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchLeads = useCallback(async (off: number, append: boolean, f: FilterState) => {
    const res  = await fetch(buildUrl(off, search, f));
    const json = await res.json();
    const rows: ApiLead[] = json.data ?? [];
    setTotal(json.count ?? 0);
    setAllLeads((prev) => append ? [...prev, ...rows] : rows);
    setOffset(off);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchLeads(0, false, filters).finally(() => setLoading(false));
  }, [filters, fetchLeads]);

  function patchFilter(patch: Partial<FilterState>) {
    setFilters((f) => ({ ...f, ...patch }));
  }
  function resetFilters() { setFilters(EMPTY_FILTERS); }

  async function loadMore() {
    setLoadingMore(true);
    await fetchLeads(offset + PAGE, true, filters);
    setLoadingMore(false);
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      setLoading(true);
      await fetchLeads(0, false, filters);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }

  const clientSearch = allLeads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.student_name?.toLowerCase().includes(q) ||
      l.guardian_name?.toLowerCase().includes(q) ||
      l.student_contact?.includes(q) ||
      l.student_email?.toLowerCase().includes(q)
    );
  });

  const hasMore     = allLeads.length < total;
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="animate-fade-in">
      <TopBar searchPlaceholder="Search leads, parents, students…" />
      <LeadDrawer bookingId={activeId} onClose={() => setActiveId(null)} />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
        <button
          className="btn-ghost"
          onClick={() => setFiltersOpen((o) => !o)}
          style={{ gap: '0.5rem', position: 'relative' }}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeCount > 0 && (
            <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, padding: '0 5px', position: 'absolute', top: -6, right: -6 }}>
              {activeCount}
            </span>
          )}
        </button>

        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: 10 }}>
          <Search size={15} color="var(--muted-foreground)" />
          <input
            type="text"
            placeholder="Search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem' }}
          />
        </div>

        <button className="icon-btn" aria-label="grid"><LayoutGrid size={16} /></button>
        <button className="btn-ghost" onClick={triggerSync} disabled={syncing} style={{ gap: '0.5rem' }}>
          <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Syncing…' : 'Sync Airtable'}
        </button>
        <button className="btn-primary"><Plus size={16} /> Add Lead</button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="card" style={{ padding: '0.875rem 1rem', marginBottom: '0.875rem' }}>
          <FilterBar
            filters={filters}
            options={filterOpts ?? null}
            onChange={patchFilter}
            onReset={resetFilters}
          />
        </div>
      )}

      {/* Banner */}
      {!loading && total > 0 && (
        <div style={{ marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--muted-foreground)', display: 'flex', gap: 6 }}>
          Showing {allLeads.length.toLocaleString()} of {total.toLocaleString()} leads
          {hasMore && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>— scroll down to load more</span>}
        </div>
      )}

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {COLS.map((col) => {
          const colLeads = clientSearch.filter((l) => l.ai_lead_scores?.[0]?.score_label === col.label).map((l, i) => mapToLead(l, i));
          const unscored = col.id === 'fresh'
            ? clientSearch.filter((l) => !l.ai_lead_scores || l.ai_lead_scores.length === 0).map((l, i) => mapToLead(l, i))
            : [];
          const all = [...colLeads, ...unscored];

          return (
            <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: col.dotColor, display: 'inline-block' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{col.title}</h3>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                    {loading ? '—' : `${all.length} loaded`}
                  </div>
                </div>
                <button aria-label="more" className="icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }}>
                  <MoreHorizontal size={14} />
                </button>
              </div>

              {loading
                ? [1, 2, 3].map((n) => <SkeletonCard key={n} />)
                : all.length === 0
                  ? <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>No {col.label.toLowerCase()} leads</div>
                  : all.map((lead) => <LeadCard key={lead.id} lead={lead} onOpen={setActiveId} />)
              }
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {!loading && hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button onClick={loadMore} disabled={loadingMore} className="btn-ghost" style={{ gap: '0.5rem', padding: '0.625rem 1.5rem' }}>
            <ChevronDown size={15} style={{ animation: loadingMore ? 'spin 1s linear infinite' : 'none' }} />
            {loadingMore ? 'Loading…' : `Load more (${allLeads.length.toLocaleString()} of ${total.toLocaleString()})`}
          </button>
        </div>
      )}

      {!loading && !hasMore && total > 0 && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
          All {total.toLocaleString()} leads loaded
        </div>
      )}
    </div>
  );
}
