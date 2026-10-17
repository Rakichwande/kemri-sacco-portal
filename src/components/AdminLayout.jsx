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
  income: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  directory: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  contributions: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7h-3a2 2 0 01-2-2V2M9 22H5a2 2 0 01-2-2V4a2 2 0 012-2h7l5 5v3M15 19l2 2 4-4"/></svg>,
  reports: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
  aging: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>,
  import: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  health: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  staff: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  audit: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  settings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

// 2026-10-17: Role-based UI filtering.
// The backend enforces permissions (403 errors), but we must also hide
// menu items the user cannot access. Otherwise, they see pages that
// result in "Missing required permission" errors.
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: icons.dashboard }], // Everyone
  },
  {
    label: 'Loans',
    items: [
      { label: 'Approval Queue', to: '/admin', icon: icons.queue, roles: ['admin', 'sacco_admin', 'loans_officer'] },
      { label: 'Disbursement Log', to: '/admin/disbursements', icon: icons.disbursement, roles: ['admin', 'sacco_admin', 'loans_officer'] },
      { label: 'Repayment History', to: '/admin/repayments', icon: icons.repayment, roles: ['admin', 'sacco_admin', 'loans_officer', 'finance_officer'] },
      { label: 'Loan Income', to: '/admin/income', icon: icons.income, roles: ['admin', 'sacco_admin', 'loans_officer', 'finance_officer'] },
    ],
  },
  {
    label: 'Members',
    items: [
      { label: 'Directory', to: '/admin/members', icon: icons.directory }, // Everyone
      { label: 'Contribution Logs', to: '/admin/contributions', icon: icons.contributions, roles: ['admin', 'sacco_admin', 'finance_officer'] },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Financial Reports', to: '/admin/reports', icon: icons.reports, roles: ['admin', 'sacco_admin', 'finance_officer', 'auditor'] },
      { label: 'Aging Report', to: '/admin/aging', icon: icons.aging, roles: ['admin', 'sacco_admin', 'loans_officer', 'auditor'] },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { label: 'Data Import', to: '/admin/data-import', icon: icons.import, roles: ['admin', 'sacco_admin'] },
      { label: 'System Health', to: '/admin/system-health', icon: icons.health, roles: ['admin'] }, // Super Admin only
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Staff Management', to: '/admin/staff', icon: icons.staff, roles: ['admin', 'sacco_admin'] },
      { label: 'Audit Trail', to: '/admin/audit-trail', icon: icons.audit, roles: ['admin', 'sacco_admin', 'auditor'] },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', to: '/admin/settings', icon: icons.settings }, // Everyone
    ],
  },
];

function AdminLayout({ title, lede, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const userRole = user?.role || 'staff';
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Determine if this user can see loan data (for the topbar pending badge)
  const canSeePendingLoans = ['admin', 'sacco_admin', 'loans_officer'].includes(userRole);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!canSeePendingLoans) return; // Don't poll if they can't see loans
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
        // Silent
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [canSeePendingLoans]);

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-mark">🏦</span>
          <div>
            <div className="admin-sidebar__brand-name">KEMRI SACCO</div>
          </div>
        </div>

        {NAV_GROUPS.map((group) => {
          // Filter items based on user role
          const visibleItems = group.items.filter((item) => {
            if (!item.roles) return true; // No roles array means everyone can see it
            return item.roles.includes(userRole);
          });

          // If no items in this group are visible to this role, hide the entire group header
          if (visibleItems.length === 0) return null;

          return (
            <div className="admin-sidebar__group" key={group.label}>
              <div className="admin-sidebar__group-label">{group.label}</div>
              {visibleItems.map((item) => {
                const isActive = item.to && location.pathname === item.to;
                if (!item.to) {
                  return (
                    <span key={item.label} className="admin-sidebar__link is-disabled">
                      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                      <span className="admin-sidebar__link-label">{item.label}</span>
                      <span className="admin-sidebar__link-badge">Soon</span>
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`admin-sidebar__link${isActive ? ' is-active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span className="admin-sidebar__link-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}

        <Link to="/admin/settings" className="admin-sidebar__footer" style={{ textDecoration: 'none' }}>
          <div className="admin-sidebar__footer-name">{user?.full_name || 'Admin'}</div>
          <div className="admin-sidebar__footer-role">{userRole.replace('_', ' ')}</div>
        </Link>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              className="admin-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <div className="admin-topbar__meta">
              <span>{today}</span>
              <span className="admin-topbar__status-dot" />
              <span>Systems operational</span>
            </div>
          </div>
          <div className="admin-topbar__actions">
            {canSeePendingLoans && pendingCount > 0 && (
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