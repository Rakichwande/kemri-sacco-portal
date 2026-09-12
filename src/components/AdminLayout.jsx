import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Nav structure mirrors the target design. `to: null` means the page
// doesn't exist yet — shown but not clickable, with a "Soon" badge, so
// the intended information architecture is visible while we build it out
// page by page.
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: null }],
  },
  {
    label: 'Loans',
    items: [
      { label: 'Approval Queue', to: '/admin' },
      { label: 'Disbursement Log', to: null },
      { label: 'Repayment History', to: null },
    ],
  },
  {
    label: 'Members',
    items: [
      { label: 'Directory', to: null },
      { label: 'Contribution Logs', to: null },
    ],
  },
  {
    label: 'Reports',
    items: [{ label: 'Financial Reports', to: null }],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Staff Management', to: null },
      { label: 'Audit Trail', to: '/admin/audit-trail' },
    ],
  },
];

function AdminLayout({ title, lede, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__brand-mark">🏦</span>
          <div>
            <div className="admin-sidebar__brand-name">KEMRI SACCO</div>
            <div className="admin-sidebar__brand-tag">Admin Console</div>
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
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__footer-name">{user?.full_name || 'Admin'}</div>
          <div className="admin-sidebar__footer-role">{user?.role || 'admin'}</div>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar__meta">
            <span>{today}</span>
            <span className="admin-topbar__status-dot" />
            <span>Systems operational</span>
          </div>
          <div className="admin-topbar__actions">
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
