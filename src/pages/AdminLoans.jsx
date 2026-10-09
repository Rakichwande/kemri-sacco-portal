import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Background refresh cadence. 20s is deliberately gentler than the 5s
// DisbursementLog uses for B2C-in-flight loans: applications arrive at
// human pace, so there's no callback window to catch, and hammering the
// endpoint would waste requests.
const POLL_INTERVAL_MS = 20000;

const STATS_CONFIG = [
  { key: 'total', label: 'Total Loans', accent: 'var(--color-ink)' },
  { key: 'pending', label: 'Pending', accent: 'var(--color-gold)' },
  { key: 'approved', label: 'Approved', accent: '#1c4a75' },
  { key: 'disbursed', label: 'Disbursed', accent: '#55308a' },
  { key: 'repaid', label: 'Repaid', accent: 'var(--color-forest)' },
  { key: 'rejected', label: 'Rejected', accent: 'var(--color-error)' },
];

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'disbursed', label: 'Disbursed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// Stable across renders, so it's safe to call inside useCallback without
// becoming a dependency.
function getToken() {
  return localStorage.getItem('token');
}

// Small refresh icon. currentColor lets it inherit the button's text color.
function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

// Read-only detail panel, opened via the "Review" action.
function ReviewModal({ loan, onClose }) {
  if (!loan) return null;
  const row = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-line)' }}>
      <span style={{ color: 'rgba(31,36,33,0.55)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{value}</span>
    </div>
  );
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 6, width: 420, maxWidth: '90vw', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
            {loan.reference || `LN-${String(loan.id).padStart(5, '0')}`}
          </div>
          <span className={`admin-badge admin-badge--${loan.status}`}>{loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16 }}>
          Member: {loan.member_name || `#${loan.member_id}`} · {loan.member_reference || '—'}
        </div>

        {row('Member', loan.member_name || loan.member_id)}
        {row('Member reference', loan.member_reference || '—')}
        {row('Phone', loan.phone_number || 'N/A')}
        {row('Purpose', loan.purpose || '—')}
        {row('Principal', formatKES(loan.principal))}
        {row('Interest rate', `${loan.interest_rate}%`)}
        {row('Term', `${loan.tenure_months} ${loan.tenure_months === 1 ? 'month' : 'months'}`)}
        {row('Total amount payable', formatKES(loan.total_repayment))}
        {row('Amount outstanding', formatKES(loan.outstanding_balance))}
        {row('Applied', new Date(loan.applied_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))}
        {loan.admin_notes && row('Admin notes', loan.admin_notes)}

        <button
          onClick={onClose}
          className="admin-btn admin-btn--approve"
          style={{ marginTop: 16, width: '100%' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function AdminLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, disbursed: 0, repaid: 0, rejected: 0 });
  const [receipt, setReceipt] = useState({});
  const [reviewing, setReviewing] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Interval handle lives in a ref so visibility pause/resume doesn't need
  // to tear down and rebuild the useEffect (which would restart the initial
  // fetch every time the tab was re-focused).
  const pollRef = useRef(null);

  // Single fetch path. `silent=true` skips the loading spinner — used for
  // background polls and post-action refreshes, so the table never flashes.
  const refreshLoans = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const token = getToken();
      if (!token) throw new Error('No token found');
      const res = await fetch(`${API_BASE}/api/loans/admin/list`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLoans(data);
      setStats({
        total: data.length,
        pending: data.filter((l) => l.status === 'pending').length,
        approved: data.filter((l) => l.status === 'approved').length,
        disbursed: data.filter((l) => l.status === 'disbursed').length,
        repaid: data.filter((l) => l.status === 'repaid').length,
        rejected: data.filter((l) => l.status === 'rejected').length,
      });
      setLastUpdated(Date.now());
      // Clear any stale error banner on a successful silent refresh — the
      // issue that showed the banner is by definition resolved.
      if (silent) setError(null);
    } catch (err) {
      console.error('Fetch loans error:', err);
      // A failed background poll should not spray an error banner over a
      // table the user is actively reading. Surface only on initial load;
      // the "Updated Xs ago" ticker naturally showing an old time is the
      // passive signal that something's stale.
      if (!silent) setError(friendlyErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + background polling.
  useEffect(() => {
    refreshLoans();

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        refreshLoans({ silent: true });
      }, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    // Pause polling when the tab is hidden (backgrounded, minimised, on
    // another browser tab). Resume + immediate refresh on return so the
    // user never sees stale data after switching back.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshLoans({ silent: true });
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshLoans]);

  // "Updated Xs ago" ticker — recomputes every second so the display stays
  // honest. Cheap, single state update, no network.
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshLoans({ silent: true });
    setRefreshing(false);
  };

  const handleApprove = async (loanId) => {
    if (!window.confirm('Approve this loan?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/approve/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminNotes: 'Approved via Admin' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve');
      }
      // Silent refresh — the row moves tabs; the table updates in place.
      refreshLoans({ silent: true });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleReject = async (loanId) => {
    const adminNotes = window.prompt('Reason for rejecting this loan (shown to the member):', '');
    if (adminNotes === null) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/reject/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminNotes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject');
      }
      refreshLoans({ silent: true });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDisburse = async (loanId) => {
    const mpesaReceipt = receipt[loanId]?.trim() || '';
    if (!mpesaReceipt && !window.confirm('No receipt entered. Continue?')) return;
    if (!window.confirm('Mark as disbursed?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/disburse/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mpesaReceipt: mpesaReceipt || 'Manual Transfer' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to disburse');
      }
      setReceipt({ ...receipt, [loanId]: '' });
      refreshLoans({ silent: true });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const badgeClass = (status) => `admin-badge admin-badge--${status}`;

  const visibleLoans = activeTab === 'all' ? loans : loans.filter((l) => l.status === activeTab);
  const tabCount = (key) => key === 'all' ? stats.total : stats[key];

  // Human-friendly "Updated 12s ago" / "Updated 2m ago" / "just now"
  const lastUpdatedText = (() => {
    if (!lastUpdated) return '';
    if (secondsAgo < 5) return 'Updated just now';
    if (secondsAgo < 60) return `Updated ${secondsAgo}s ago`;
    const mins = Math.floor(secondsAgo / 60);
    return `Updated ${mins}m ago`;
  })();

  return (
    <AdminLayout
      title="Loan Approval Queue"
      lede="Review applications and action approvals, rejections, and disbursements."
    >
      {error && (
        <div className="error-banner" style={{ marginBottom: 24 }}>
          {error}
          <div style={{ marginTop: 8 }}>
            <button className="admin-btn admin-btn--approve" onClick={handleManualRefresh}>Retry</button>
          </div>
        </div>
      )}

      {/* Freshness bar — shows how stale the list is, and gives staff a
          manual refresh for the impatient case. Auto-refresh runs every
          ${POLL_INTERVAL_MS/1000}s regardless. */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, fontSize: '0.78rem', color: 'rgba(31,36,33,0.5)',
      }}>
        <span>{lastUpdatedText}</span>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid var(--color-line)',
            borderRadius: 4, padding: '5px 10px', cursor: refreshing ? 'wait' : 'pointer',
            fontSize: '0.78rem', color: 'var(--color-ink)',
            opacity: refreshing ? 0.6 : 1,
          }}
          title="Refresh now"
        >
          <RefreshIcon />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
        {STATS_CONFIG.map((s) => (
          <div className="admin-stat-card" style={{ '--stat-accent': s.accent }} key={s.key}>
            <div className="admin-stat-card__value">{stats[s.key]}</div>
            <div className="admin-stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : loans.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No loans found. Apply for a test loan via USSD (Option 4) to see it here.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px', borderRadius: 4, fontSize: '0.85rem', fontWeight: 500,
                  cursor: 'pointer', border: '1px solid var(--color-line)',
                  background: activeTab === tab.key ? 'var(--color-forest-deep)' : '#fff',
                  color: activeTab === tab.key ? '#fff' : 'var(--color-ink)',
                }}
              >
                {tab.label} ({tabCount(tab.key)})
              </button>
            ))}
          </div>

          {visibleLoans.length === 0 ? (
            <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
              No loans in this category.
            </div>
          ) : (
          <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Loan Ref</th>
                <th>Member</th>
                <th>Member Ref</th>
                <th style={{ textAlign: 'right' }}>Principal</th>
                <th>Applied</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLoans.map((loan) => (
                <tr key={loan.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-forest-deep)' }}>
                    {loan.reference || `LN-${String(loan.id).padStart(5, '0')}`}
                  </td>
                  <td style={{ fontWeight: 500 }}>{loan.member_name || loan.member_id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>
                    {loan.member_reference || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatKES(loan.principal)}</td>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                    {new Date(loan.applied_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                  <td>
                    <span className={badgeClass(loan.status)}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                      <button
                        onClick={() => setReviewing(loan)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-forest)', fontSize: '0.82rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        Review
                      </button>
                      {loan.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="admin-btn admin-btn--approve" onClick={() => handleApprove(loan.id)}>Approve</button>
                          <button className="admin-btn admin-btn--reject" onClick={() => handleReject(loan.id)}>Reject</button>
                        </div>
                      )}
                      {loan.status === 'approved' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 160 }}>
                          <input
                            type="text"
                            placeholder="M-Pesa Receipt"
                            value={receipt[loan.id] || ''}
                            onChange={(e) => setReceipt({ ...receipt, [loan.id]: e.target.value })}
                            style={{
                              padding: '6px 8px', border: '1px solid var(--color-line)',
                              borderRadius: 4, fontSize: '0.82rem',
                            }}
                          />
                          <button className="admin-btn admin-btn--disburse" onClick={() => handleDisburse(loan.id)}>Disburse</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          )}
        </>
      )}

      <ReviewModal loan={reviewing} onClose={() => setReviewing(null)} />
    </AdminLayout>
  );
}

export default AdminLoans;