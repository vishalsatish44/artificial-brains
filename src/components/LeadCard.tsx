'use client';

import React from 'react';
import {
  Phone,
  MapPin,
  BookOpen,
  Mail,
  Calendar,
  PhoneCall,
  MessageSquare,
  StickyNote,
} from 'lucide-react';

export type Lead = {
  id: string;
  parentName: string;
  studentName: string;
  phone: string;
  location: string;
  package: string;
  email: string;
  assigneeName: string;
  assigneeAvatar: string;
  score: number;
  bookedAt: string;
  avatarColor: string;
  initials: string;
};

const initialsBg = (color: string) => {
  switch (color) {
    case 'green':
      return { bg: '#10b981', fg: '#ffffff' };
    case 'pink':
      return { bg: '#fbcfe8', fg: '#9d174d' };
    case 'blue':
      return { bg: '#3b82f6', fg: '#ffffff' };
    case 'purple':
      return { bg: '#c4b5fd', fg: '#4c1d95' };
    case 'cyan':
      return { bg: '#67e8f9', fg: '#155e75' };
    case 'rose':
      return { bg: '#f9a8a8', fg: '#7f1d1d' };
    case 'amber':
      return { bg: '#fcd34d', fg: '#78350f' };
    case 'orange':
      return { bg: '#fdba74', fg: '#7c2d12' };
    default:
      return { bg: '#e5e7eb', fg: '#374151' };
  }
};

const scoreChip = (score: number) => {
  if (score >= 80) return { bg: '#10b981', fg: '#ffffff', label: 'High' };
  if (score >= 50) return { bg: '#fcd34d', fg: '#78350f', label: 'Moderate' };
  return { bg: '#ef4444', fg: '#ffffff', label: 'Repeated' };
};

const InfoRow = ({
  icon: Icon,
  text,
  iconColor,
}: {
  icon: React.ElementType;
  text: string;
  iconColor: string;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--muted)' }}>
    <Icon size={13} color={iconColor} />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
  </div>
);

const LeadCard = ({ lead, onOpen }: { lead: Lead; onOpen?: (id: string) => void }) => {
  const av = initialsBg(lead.avatarColor);
  const sc = scoreChip(lead.score);

  return (
    <div
      className="card"
      onClick={() => onOpen?.(lead.id)}
      style={{
        padding: '0.95rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        cursor: onOpen ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseOver={(e) => { if (onOpen) e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,0.09)'; }}
      onMouseOut={(e) => { e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: av.bg,
            color: av.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.75rem',
            flexShrink: 0,
          }}
        >
          {lead.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--foreground)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {lead.parentName}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
            Student: {lead.studentName}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem 0.875rem',
        }}
      >
        <InfoRow icon={Phone} text={lead.phone} iconColor="#10b981" />
        <InfoRow icon={MapPin} text={lead.location} iconColor="#10b981" />
        <InfoRow icon={BookOpen} text={lead.package} iconColor="#10b981" />
        <InfoRow icon={Mail} text={lead.email} iconColor="#10b981" />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0.5rem 0.625rem',
          background: 'var(--background)',
          borderRadius: 10,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: 'linear-gradient(135deg, #fcd34d, #fb923c)',
            color: '#7c2d12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6rem',
            fontWeight: 700,
          }}
        >
          {lead.assigneeAvatar}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--foreground)', fontWeight: 500, flex: 1 }}>
          {lead.assigneeName}
        </span>
        <span
          className="chip"
          style={{
            background: sc.bg,
            color: sc.fg,
            fontSize: '0.7rem',
            padding: '0.15rem 0.45rem',
          }}
        >
          {sc.label} · {lead.score}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.25rem',
          borderTop: '1px dashed var(--border-strong)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.72rem',
            color: 'var(--muted)',
          }}
        >
          <Calendar size={13} />
          {lead.bookedAt}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            aria-label="call"
            style={{ color: 'var(--muted)', padding: 4, borderRadius: 6 }}
          >
            <PhoneCall size={15} />
          </button>
          <button
            aria-label="message"
            style={{ color: 'var(--muted)', padding: 4, borderRadius: 6 }}
          >
            <MessageSquare size={15} />
          </button>
          <button
            aria-label="note"
            style={{ color: 'var(--muted)', padding: 4, borderRadius: 6 }}
          >
            <StickyNote size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
