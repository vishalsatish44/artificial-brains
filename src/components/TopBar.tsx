'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, SlidersHorizontal, Bell, LogOut } from 'lucide-react';

type Props = {
  searchPlaceholder?: string;
};

function readEmailCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)sb-user-email=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function initials(email: string): string {
  if (!email) return 'SS';
  const name = email.split('@')[0];
  const parts = name.split(/[._\-+]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'SS';
}

const TopBar = ({ searchPlaceholder = 'Search leads, parents, students…' }: Props) => {
  const router = useRouter();
  const [email, setEmail] = useState('');

  useEffect(() => {
    setEmail(readEmailCookie());
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const displayName = email ? email.split('@')[0] : 'User';
  const userInitials = initials(email);

  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
      <button className="btn-primary" style={{ padding: '0.625rem 1rem' }}>
        <Sparkles size={16} />
        Ask AI
      </button>

      <div
        className="card"
        style={{
          flex: 1,
          maxWidth: 560,
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.5rem 0.875rem',
          borderRadius: 999,
          margin: '0 auto',
        }}
      >
        <Search size={16} color="var(--muted-foreground)" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.875rem',
            color: 'var(--foreground)',
          }}
        />
        <button
          aria-label="filters"
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
            background: 'var(--background)',
          }}
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      <button aria-label="notifications" className="icon-btn" style={{ position: 'relative' }}>
        <Bell size={18} />
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'var(--error)',
            border: '2px solid var(--surface)',
          }}
        />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>Signed in as</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: 'linear-gradient(135deg, #fcd34d, #fb923c)',
            color: '#7c2d12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: '2px solid var(--surface)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {userInitials}
        </div>
        <button
          aria-label="Sign out"
          onClick={handleLogout}
          className="icon-btn"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
