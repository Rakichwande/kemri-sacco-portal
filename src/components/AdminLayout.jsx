import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Small hand-drawn line icons - no icon library is installed, and adding
// one just for a sidebar isn't worth the dependency. currentColor lets each
// icon inherit the link's text color automatically (active/inactive/disabled).
const icons = {
  dashboard: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  queue: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>,
  disbursement: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  repayment: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg>,
  directory: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  contributions: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7h-3a2 2 0 01-2-2V2M9 22H5a2 2 0 01-2-2V4a2 2 0 012-2h7l5 5v3M15 19l2 2 4-4"/></svg>,
  reports: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
  import: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  health: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  staff: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  audit: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

// Nav structure mirrors the target design. `to: null` means the page
// doesn't exist yet — shown but not clickable, with a "Soon" badge, so
// the intended information architecture is visible while we build it out
// page by page.
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: icons.dashboard }],
  },
  {
    label: 'Loans',
    items: [
      { label: 'Approval Queue', to: '/admin', icon: icons.queue },
      { label: 'Disbursement Log', to: '/admin/disbursements', icon: icons.disbursement },
      { label: 'Repayment History', to: '/admin/repayments', icon: icons.repayment },
    ],
  },
  {
    label: 'Members',
    items: [
      { label: 'Directory', to: '/admin/members', icon: icons.directory },
      { label: 'Contribution Logs', to: '/admin/contributions', icon: icons.contributions },
    ],
  },
  {
    label: 'Reports',
    items: [{ label: 'Financial Reports', to: '/admin/reports', icon: icons.reports }],
  },
  {
    label: 'Configuration',
    items: [
      { label: 'Data Import', to: '/admin/data-import', icon: icons.import },
      { label: 'System Health', to: '/admin/system-health', icon: icons.health },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Staff Management', to: '/admin/staff', icon: icons.staff },
      { label: 'Audit Trail', to: '/admin/audit-trail', icon: icons.audit },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', to: '/admin/settings', icon: icons.settings },
    ],
  },
];

function AdminLayout({ title, lede, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(null);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Polls for pending loan applications so the count is visible on every
  // page, not just the Dashboard - a real-time push would need websockets,
  // which this stack doesn't have; a 30s poll is a reasonable stand-in.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/loans/admin/pending`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPendingCount(data.length);
      } catch (err) {
        // Silent - this is a background convenience indicator, not critical path
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-mark">🏦</span>
          <div>
            <div className="admin-sidebar__brand-name">KEMRI SACCO</div>
          </div>
        </div>

        {NAV_GROUPS.map((group) => (
          <div className="admin-sidebar__group" key={group.label}>
            <div className="admin-sidebar__group-label">{group.label}</div>
            {group.items.map((item) => {
              const isActive = item.to && location.pathname === item.to;
              if (!item.to) {
                return (
                  <span key={item.label} className="admin-sidebar__link is-disabled">
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                    <span className="admin-sidebar__link-badge">Soon</span>
                  </span>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`admin-sidebar__link${isActive ? ' is-active' : ''}`}
                >
                  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        <Link to="/admin/settings" className="admin-sidebar__footer" style={{ textDecoration: 'none' }}>
          <div className="admin-sidebar__footer-name">{user?.full_name || 'Admin'}</div>
          <div className="admin-sidebar__footer-role">{user?.role || 'admin'}</div>
        </Link>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar__meta">
            <span>{today}</span>
            <span className="admin-topbar__status-dot" />
            <span>Systems operational</span>
          </div>
          <div className="admin-topbar__actions">
            {pendingCount > 0 && (
              <Link to="/admin" style={{
                display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
                background: 'var(--color-gold-soft)', color: '#7a5a10', padding: '6px 12px',
                borderRadius: 999, fontSize: '0.82rem', fontWeight: 600,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                {pendingCount} pending
              </Link>
            )}
            <button className="admin-topbar__logout" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="admin-content">
          {title && <h1 className="admin-page-title">{title}</h1>}
          {lede && <p className="admin-page-lede">{lede}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
