'use client';

import React, { useState, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import { LeadDrawer } from '@/components/LeadDrawer';
import { useApi } from '@/hooks/useApi';
import {
  GraduationCap, Search, ChevronDown, ChevronLeft, ChevronRight,
  MessageSquare, IndianRupee, Users, TrendingUp, GitBranch,
} from 'lucide-react';

const PAGE_SIZE = 50;

type EnrolledRow = {
  id: string;
  batch_id: string | null;
  subject_enrolled: string | null;
  sales_person_name: string | null;
  enrollment_date: string | null;
  type_of_enrollment: string | null;
  classes_included: number | null;
  payment_amount: number | null;
  currency: string | null;
  collection_inr: number | null;
  mode_of_payment: string | null;
  is_referral: boolean;
  onboarding_message_sent: boolean;
  demo_booking_id: string | null;
  demo_bookings: {
    id: string;
    student_name: string | null;
    guardian_name: string | null;
    student_contact: string | null;
    whatsapp_contact: string | null;
    student_email: string | null;
    country: string | null;
    city: string | null;
    grade: string | null;
    presales_agent_name: string[] | null;
  } | null;
};

type ApiResp = { ok: boolean; data: EnrolledRow[]; count: number | null; totalRevenue: number; referrals: number };

function pageWindows(cur: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | '…')[] = [0];
  if (cur > 2) pages.push('…');
  for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) pages.push(i);
  if (cur < total - 3) pages.push('…');
  pages.push(total - 1);
  return pages;
}

function PaginationBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ minWidth: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: '0.8rem', fontWeight: active ? 700 : 500, padding: '0 6px', background: active ? 'var(--foreground)' : 'var(--surface)', color: active ? 'var(--surface)' : disabled ? 'var(--muted-foreground)' : 'var(--foreground)', border: `1px solid ${active ? 'var(--foreground)' : 'var(--border-strong)'}`, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  );
}

function ReferralBtn({ row }: { row: EnrolledRow }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const b = row.demo_bookings;
  const phone    = b?.whatsapp_contact ?? b?.student_contact ?? '';
  const guardian = b?.guardian_name ?? b?.student_name ?? 'Sir/Ma\'am';
  const student  = b?.student_name ?? 'your child';
  const agent    = b?.presales_agent_name?.[0] ?? row.sales_person_name ?? 'Super Sheldon Team';

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
          templateName: 'parent_feedback_referral',
          variables: [guardian, student, agent],
          demoBookingId: b?.id,
        }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }, [phone, guardian, student, agent, b?.id, status]);

  const color = status === 'sent' ? '#10b981' : status === 'error' ? '#ef4444' : '#25d366';
  const label = status === 'sending' ? '…' : status === 'sent' ? '✓ Sent' : status === 'error' ? '✗ Failed' : 'Referral';

  return (
    <button
      onClick={send}
      title="Send feedback & referral request via WhatsApp"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${color}15`, color, border: `1px solid ${color}40`, borderRadius: 8, padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, cursor: status === 'idle' || status === 'error' ? 'pointer' : 'default' }}
    >
      <MessageSquare size={11} /> {label}
    </button>
  );
}

export default function EnrolledPage() {
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  const url = `/api/enrolled?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${searchParam}`;
  const { data, loading } = useApi<ApiResp>(url);

  const total      = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from       = page * PAGE_SIZE + 1;
  const to         = Math.min((page + 1) * PAGE_SIZE, total);
  const rows       = data?.data ?? [];

  function goTo(p: number) {
    if (p < 0 || p >= totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="animate-fade-in">
      <TopBar searchPlaceholder="Search enrolled…" />
      <LeadDrawer bookingId={activeId} onClose={() => setActiveId(null)} />

      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>Enrolled Customers</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>All students who converted and enrolled — from the After Sales table</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Enrolled',    value: loading ? '—' : total.toLocaleString(),                             color: '#10b981', Icon: Users },
          { label: 'Revenue (INR)',     value: loading ? '—' : `₹${(data?.totalRevenue ?? 0).toLocaleString()}`,   color: '#3b82f6', Icon: IndianRupee },
          { label: 'Referral Leads',   value: loading ? '—' : String(data?.referrals ?? 0),                        color: '#6366f1', Icon: GitBranch },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.Icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: 10, maxWidth: 340 }}>
          <Search size={14} color="var(--muted-foreground)" />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', flex: 1 }}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <GraduationCap size={14} color="var(--muted-foreground)" />
          <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
            Use the <strong>Referral</strong> button to send a WhatsApp feedback & referral request to each parent
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card-lg" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Parent / Student', 'Contact', 'Subject', 'Grade', 'Enrolled On', 'Plan', 'Payment', 'Agent', 'Referral?', 'WA', ''].map((h) => (
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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                  {data ? 'No enrolled customers found.' : 'Loading…'}
                </td>
              </tr>
            ) : rows.map((r) => {
              const b = r.demo_bookings;
              return (
                <tr
                  key={r.id}
                  onClick={() => b && setActiveId(b.id)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: b ? 'pointer' : 'default', transition: 'background 0.1s' }}
                  onMouseOver={(e) => { if (b) e.currentTarget.style.background = 'var(--background)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{b?.guardian_name ?? b?.student_name ?? '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>
                      {b?.student_name} · {[b?.city, b?.country].filter(Boolean).join(', ') || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{b?.student_contact ?? b?.whatsapp_contact ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem' }}>{r.subject_enrolled ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{b?.grade ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {r.enrollment_date ? new Date(r.enrollment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem' }}>
                    <div>{r.type_of_enrollment ?? '—'}</div>
                    {r.classes_included && <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{r.classes_included} classes</div>}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {r.payment_amount ? (
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.currency} {r.payment_amount.toLocaleString()}</span>
                        {r.collection_inr && <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>₹{r.collection_inr.toLocaleString()}</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>{r.sales_person_name ?? b?.presales_agent_name?.[0] ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {r.is_referral ? (
                      <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem' }}>Referral</span>
                    ) : (
                      <span style={{ background: '#f1f5f9', color: 'var(--muted-foreground)', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem' }}>Organic</span>
                    )}
                  </td>
                  <td style={{ padding: '0.875rem 0.5rem' }} onClick={(e) => e.stopPropagation()}>
                    <ReferralBtn row={r} />
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
            Showing {from}–{to} of {total.toLocaleString()} enrolled customers
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
