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
];

function NotificationSettingsModal({ onClose }) {
  const [prefs, setPrefs] = useState({ notify_sms: true, notify_email: false, phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const u = data.user || {};
        setPrefs({
          notify_sms: u.notify_sms ?? true,
          notify_email: u.notify_email ?? false,
          phone: u.phone || '',
          email: u.email || '',
        });
      })
      .catch(() => setError('Could not load your current settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/auth/me/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Failed to save');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 6, width: 380, maxWidth: '90vw', padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 16 }}>
          Notification Settings
        </div>
        {loading ? (
          <div style={{ color: 'rgba(31,36,33,0.5)', fontSize: '0.88rem' }}>Loading…</div>
        ) : (
          <form onSubmit={handleSave}>
            {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Phone</div>
              <input value={prefs.phone} onChange={(e) => setPrefs({ ...prefs, phone: e.target.value })}
                placeholder="0712345678"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Email</div>
              <input value={prefs.email} onChange={(e) => setPrefs({ ...prefs, email: e.target.value })}
                placeholder="you@kemri.go.ke"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', marginBottom: 8 }}>
              <input type="checkbox" checked={prefs.notify_sms} onChange={(e) => setPrefs({ ...prefs, notify_sms: e.target.checked })} />
              Notify me via SMS
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', marginBottom: 18 }}>
              <input type="checkbox" checked={prefs.notify_email} onChange={(e) => setPrefs({ ...prefs, notify_email: e.target.checked })} />
              Notify me via Email
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="admin-btn admin-btn--approve" style={{ flex: 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AdminLayout({ title, lede, children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
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

        <button
          onClick={() => setShowSettings(true)}
          className="admin-sidebar__footer"
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
        >
          <div className="admin-sidebar__footer-name">{user?.full_name || 'Admin'}</div>
          <div className="admin-sidebar__footer-role">{user?.role || 'admin'} · Notification settings</div>
        </button>
      </aside>

      {showSettings && <NotificationSettingsModal onClose={() => setShowSettings(false)} />}

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
