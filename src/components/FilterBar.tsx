'use client';

import React from 'react';
import { X } from 'lucide-react';

export type FilterState = {
  country:      string;
  grade:        string;
  demo_subject: string;
  lead_source:  string;
  agent:        string;
  date_from:    string;
  date_to:      string;
};

export const EMPTY_FILTERS: FilterState = {
  country: '', grade: '', demo_subject: '', lead_source: '', agent: '', date_from: '', date_to: '',
};

export type FilterOptions = {
  countries: string[];
  grades:    string[];
  subjects:  string[];
  sources:   string[];
  agents:    string[];
};

type Props = {
  filters:  FilterState;
  options:  FilterOptions | null;
  onChange: (patch: Partial<FilterState>) => void;
  onReset:  () => void;
};

export function buildFilterParams(filters: FilterState): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.country)      p.country      = filters.country;
  if (filters.grade)        p.grade        = filters.grade;
  if (filters.demo_subject) p.demo_subject = filters.demo_subject;
  if (filters.lead_source)  p.lead_source  = filters.lead_source;
  if (filters.agent)        p.agent        = filters.agent;
  if (filters.date_from)    p.date_from    = filters.date_from;
  if (filters.date_to)      p.date_to      = filters.date_to;
  return p;
}

export function FilterBar({ filters, options, onChange, onReset }: Props) {
  const hasActive = Object.values(filters).some(Boolean);

  const selStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 0.625rem',
    borderRadius: 8,
    fontSize: '0.8rem',
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border-strong)'}`,
    background: active ? 'var(--primary-soft)' : 'var(--surface)',
    color: active ? 'var(--primary)' : 'var(--muted)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    outline: 'none',
    maxWidth: 160,
  });

  const Sel = ({ label, k, choices }: { label: string; k: keyof FilterState; choices: string[] }) => (
    <select
      value={filters[k]}
      onChange={(e) => onChange({ [k]: e.target.value })}
      style={selStyle(!!filters[k])}
    >
      <option value="">{label}</option>
      {choices.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );

  const dateStyle = (active: boolean): React.CSSProperties => ({
    ...selStyle(active),
    width: 136,
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
      <Sel label="All Countries"  k="country"      choices={options?.countries ?? []} />
      <Sel label="All Grades"     k="grade"        choices={options?.grades ?? []} />
      <Sel label="All Subjects"   k="demo_subject" choices={options?.subjects ?? []} />
      <Sel label="All Sources"    k="lead_source"  choices={options?.sources ?? []} />
      <Sel label="All Agents"     k="agent"        choices={options?.agents ?? []} />
      <input
        type="date"
        value={filters.date_from}
        onChange={(e) => onChange({ date_from: e.target.value })}
        title="From date"
        style={dateStyle(!!filters.date_from)}
      />
      <input
        type="date"
        value={filters.date_to}
        onChange={(e) => onChange({ date_to: e.target.value })}
        title="To date"
        style={dateStyle(!!filters.date_to)}
      />
      {hasActive && (
        <button
          onClick={onReset}
          className="btn-ghost"
          style={{ gap: 4, fontSize: '0.78rem', padding: '0.375rem 0.625rem', color: '#ef4444', borderColor: '#ef4444', display: 'inline-flex', alignItems: 'center' }}
        >
          <X size={12} /> Reset
        </button>
      )}
    </div>
  );
}
