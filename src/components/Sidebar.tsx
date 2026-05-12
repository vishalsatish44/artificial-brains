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

const Sidebar = ({ isHovered, setIsHovered }: { isHovered: boolean, setIsHovered: (v: boolean) => void }) => {
  const pathname = usePathname();

  return (
    <aside
      style={{
        height: '100vh',
        width: isHovered ? '260px' : '72px',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'rgba(5, 10, 20, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0.75rem',
        zIndex: 100,
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isHovered ? 'flex-start' : 'center',
          marginBottom: '1.5rem',
          transition: 'all 0.2s ease',
          width: '100%',
          paddingLeft: isHovered ? '0.75rem' : '0',
          gap: '0.75rem',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <img 
          src="/logo.png" 
          alt="Logo" 
          style={{ 
            width: isHovered ? 55 : 44,
            height: 'auto',
            flexShrink: 0, 
            borderRadius: '4px', 
            filter: 'drop-shadow(0 0 5px rgba(0, 255, 255, 0.5))',
            transition: 'all 0.2s ease',
          }} 
        />
        <div style={{ 
          opacity: isHovered ? 1 : 0, 
          transition: 'opacity 0.2s ease',
          whiteSpace: 'nowrap',
          display: isHovered ? 'block' : 'none',
        }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#ffffff' }}>
            Demo Audit
          </div>
        </div>
      </Link>

      <nav style={{ flex: 1, marginTop: '0.5rem', overflow: 'hidden' }}>
        {sections.map((section) => (
          <div key={section.label}>
            <div className="section-label" style={{ 
              color: 'rgba(255, 255, 255, 0.4)',
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.2s ease',
              whiteSpace: 'nowrap',
              visibility: isHovered ? 'visible' : 'hidden',
            }}>{section.label}</div>
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
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                      background: isActive ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.875rem',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none',
                      overflow: 'hidden',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: isActive ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}>
                      <Icon size={16} color={isActive ? 'var(--primary)' : 'currentColor'} />
                    </div>
                    <span style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                      visibility: isHovered ? 'visible' : 'hidden',
                    }}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>


    </aside>
  );
};

export default Sidebar;
