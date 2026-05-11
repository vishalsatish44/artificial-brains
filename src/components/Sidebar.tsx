'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  History,
  GraduationCap,
  Sparkles,
  Bell,
  AlertTriangle,
  BarChart2,
  GitMerge,
  BookMarked,
} from 'lucide-react';

type Item = { name: string; icon: React.ElementType; path: string };
type Section = { label: string; items: Item[] };

const sections: Section[] = [
  {
    label: 'Main Menu',
    items: [
      { name: 'Dashboard',       icon: LayoutDashboard, path: '/' },
    ],
  },
  {
    label: 'Lead Tools',
    items: [
      { name: 'Leads Management', icon: Users,          path: '/leads' },
      { name: 'Demo History',     icon: History,        path: '/history' },
      { name: 'Duplicates',       icon: AlertTriangle,  path: '/duplicates' },
      { name: 'Enrolled Customers', icon: BookMarked,   path: '/enrolled' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Analytics',         icon: BarChart2, path: '/analytics' },
      { name: 'Pipeline & Funnel', icon: GitMerge,  path: '/pipeline' },
    ],
  },
  {
    label: 'Notifications',
    items: [
      { name: 'Notification Center', icon: Bell, path: '/notifications' },
    ],
  },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside
      style={{
        height: '100vh',
        width: '260px',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0.75rem',
        zIndex: 100,
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0 0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(16, 185, 129, 0.25)',
          }}
        >
          <GraduationCap size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Super Sheldon
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>
            Demo AI Console
          </div>
        </div>
      </Link>

      <nav style={{ flex: 1, marginTop: '0.5rem', overflowY: 'auto' }}>
        {sections.map((section) => (
          <div key={section.label}>
            <div className="section-label">{section.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.items.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 0.75rem',
                      borderRadius: 10,
                      color: isActive ? 'var(--foreground)' : 'var(--muted)',
                      background: isActive ? 'var(--primary-soft)' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.875rem',
                      transition: 'background 0.15s ease, color 0.15s ease',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--background)';
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Icon size={18} color={isActive ? 'var(--primary)' : 'currentColor'} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)',
          border: '1px solid #d1fae5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sparkles size={14} color="var(--primary)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
            AI Active
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.45 }}>
          Sync Airtable from the Leads page to score all leads automatically.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
