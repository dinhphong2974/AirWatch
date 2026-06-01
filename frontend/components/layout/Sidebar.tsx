'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',        icon: '📡', label: 'Live Dashboard' },
  { href: '/history', icon: '📈', label: 'History'        },
  { href: '/forecast',icon: '🤖', label: 'AI Forecast'    },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar sidebar">
      <span className="sidebar-label">Navigation</span>
      {NAV.map(({ href, icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`sidebar-link ${pathname === href ? 'active' : ''}`}
        >
          <span className="sidebar-icon">{icon}</span>
          {label}
        </Link>
      ))}

      <span className="sidebar-label">System</span>
      <div className="sidebar-link" style={{ cursor: 'default' }}>
        <span className="sidebar-icon">📡</span>
        <span style={{ fontSize: '0.8125rem' }}>STM32 Node 1</span>
      </div>
      <div className="sidebar-link" style={{ cursor: 'default' }}>
        <span className="sidebar-icon">📶</span>
        <span style={{ fontSize: '0.8125rem' }}>ESP32 Gateway</span>
      </div>
    </aside>
  );
}
