import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  { key: 'repaid', label: 'Repaid' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function getToken() {
  return localStorage.getItem('token');
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function ReviewModal({ loan, onClose }) {
  if (!loan) return null;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Pending';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const row = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-line)' }}>
      <span style={{ color: 'rgba(31,36,33,0.55)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: '0.88rem', textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 6, width: 440, maxWidth: '90vw', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
            {loan.reference || `LN-${String(loan.id).padStart(5, '0')}`}
          </div>
          <span className={`admin-badge admin-badge--${loan.status}`}>{loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16 }}>
          Member: {loan.member_name || `#${loan.member_id}`} · {loan.member_reference || '—'}
        </div>

        {row('Phone', loan.phone_number || 'N/A')}
        {row('Credit Limit', loan.is_board_staff ? 'BOARD/STAFF (10K)' : `KES ${Number(loan.credit_limit).toLocaleString()}`)}
        {row('Purpose', loan.purpose || '—')}
        {row('Principal', formatKES(loan.principal))}
        {row('Interest rate', `${loan.interest_rate}%`)}
        {row('Total amount payable', formatKES(loan.total_repayment))}
        {row('Amount outstanding', formatKES(loan.outstanding_balance))}
        
        {/* 2026-11-01: Loan Timeline */}
        <div style={{ marginTop: 16, padding: 12, background: 'var(--color-sage-soft)', borderRadius: 4 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-forest)', marginBottom: 8 }}>Loan Timeline</div>
          {row('Applied At', formatDate(loan.applied_at))}
          {row('Approved At', formatDate(loan.approved_at))}
          {row('Disbursed At', formatDate(loan.disbursed_at))}
          {loan.next_payment_due && row('Due Date', new Date(loan.next_payment_due).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))}
        </div>

        {loan.admin_notes && row('Admin notes', loan.admin_notes)}

        <button onClick={onClose} className="admin-btn admin-btn--approve" style={{ marginTop: 16, width: '100%' }}>
          Close
        </button>
      </div>
    </div>
  );
}

function AdminLoans() {
  const { user } = useAuth();
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

  const canManageLoans = ['admin', 'sacco_admin', 'loans_officer'].includes(user?.role);

  const initialTabSetRef = useRef(false);
  const pollRef = useRef(null);

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

      if (!initialTabSetRef.current) {
        const firstWithRows = ['pending', 'approved', 'disbursed', 'repaid', 'rejected']
          .find((key) => data.some((l) => l.status === key));
        setActiveTab(firstWithRows || 'all');
        initialTabSetRef.current = true;
      }

      setLastUpdated(Date.now());
      if (silent) setError(null);
    } catch (err) {
      console.error('Fetch loans error:', err);
      if (!silent) setError(friendlyErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
          data-tooltip="Refresh now"
        >
          <RefreshIcon />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="queue-stat-row">
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
          <div className="queue-tabs">
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
                <th>Timeline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleLoans.map((loan) => {
                const isOverLimit = Number(loan.credit_limit) === 0 || (Number(loan.principal) > Number(loan.credit_limit));
                
                return (
                <tr key={loan.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-forest-deep)' }}>
                    {loan.reference || `LN-${String(loan.id).padStart(5, '0')}`}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {loan.member_name || loan.member_id}
                      {loan.is_board_staff ? (
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>BOARD/STAFF</span>
                      ) : Number(loan.credit_limit) === 0 ? (
                        <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>NO LOAN</span>
                      ) : (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                          LIMIT: KES {Number(loan.credit_limit).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {!loan.is_board_staff && isOverLimit && (
                      <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: 4, fontWeight: 500 }}>
                        ⚠️ Request exceeds limit
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>
                    {loan.member_reference || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatKES(loan.principal)}</td>
                  
                  <td style={{ color: 'rgba(31,36,33,0.6)', fontSize: '0.8rem' }}>
                    <div>App: {new Date(loan.applied_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                    {loan.approved_at && <div>Appr: {new Date(loan.approved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>}
                    {loan.disbursed_at && <div style={{ color: 'var(--color-forest)', fontWeight: 500 }}>Disb: {new Date(loan.disbursed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>}
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
                      
                      {loan.status === 'pending' && canManageLoans && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="admin-btn admin-btn--approve" onClick={() => handleApprove(loan.id)}>Approve</button>
                          <button className="admin-btn admin-btn--reject" onClick={() => handleReject(loan.id)}>Reject</button>
                        </div>
                      )}
                      
                      {loan.status === 'approved' && canManageLoans && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 160 }}>
                          
                          {/* 2026-11-02: SECURITY GATEKEEPER - Hide Disburse if over limit */}
                          {isOverLimit ? (
                            <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600, padding: '6px 0' }}>
                              Cannot Disburse (Over Limit)
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}

                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
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