import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';
import CombinedTrend from '../components/CombinedTrend';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Dashboard is a board-facing view, not an operational queue. 60s keeps
// numbers fresh without hammering the summary query — which is heavier
// than the queue's per-loan list because it aggregates the whole book.
const POLL_INTERVAL_MS = 60000;

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

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pollRef = useRef(null);

  // Single fetch path. silent=true skips the full-page spinner — used for
  // background polls and post-load refreshes so the dashboard never blanks.
  const refreshSummary = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const token = getToken();
      if (!token) throw new Error('No token found');
      const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setSummary(await res.json());
      setLastUpdated(Date.now());
      if (silent) setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      // A failed background poll shouldn't cover a board-readable page in
      // red. Surface only on initial load; the "Updated Xs ago" ticker
      // naturally shows staleness for the silent case.
      if (!silent) setError(friendlyErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + background polling + visibility pause.
  useEffect(() => {
    refreshSummary();

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        refreshSummary({ silent: true });
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
        refreshSummary({ silent: true });
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
  }, [refreshSummary]);

  // "Updated Xs ago" ticker.
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshSummary({ silent: true });
    setRefreshing(false);
  };

  // This month's repayments, pulled from the last entry of the monthly
  // series (the array always ends with the current month).
  const thisMonthRepayments = summary?.monthlySeries?.length
    ? summary.monthlySeries[summary.monthlySeries.length - 1].repayments
    : 0;

  const lastUpdatedText = (() => {
    if (!lastUpdated) return '';
    if (secondsAgo < 5) return 'Updated just now';
    if (secondsAgo < 60) return `Updated ${secondsAgo}s ago`;
    const mins = Math.floor(secondsAgo / 60);
    return `Updated ${mins}m ago`;
  })();

  return (
    <AdminLayout title="Dashboard" lede="SACCO-wide overview.">
      {error && (
        <div className="error-banner" style={{ marginBottom: 20 }}>
          {error}
          <div style={{ marginTop: 8 }}>
            <button className="admin-btn admin-btn--approve" onClick={handleManualRefresh}>Retry</button>
          </div>
        </div>
      )}

      {/* Freshness bar — same pattern as AdminLoans. Auto-refresh runs
          every 60s regardless; this tells you how stale the page is and
          gives a manual override. */}
      {!loading && (
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
              borderRadius: 4, padding: '5px 10px',
              cursor: refreshing ? 'wait' : 'pointer',
              fontSize: '0.78rem', color: 'var(--color-ink)',
              opacity: refreshing ? 0.6 : 1,
            }}
            title="Refresh now"
          >
            <RefreshIcon />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : summary ? (
        <>
          {/* Seven-card stat row — layout in styles.css under
              .dashboard-stat-row. Explicit breakpoints: 7 / 4+3 / 3+3+1 /
              2+2+2+1. */}
          <div className="dashboard-stat-row">
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
              <div className="admin-stat-card__value">{summary.totalMembers}</div>
              <div className="admin-stat-card__label">Total Members</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-forest)' }}>
              <div className="admin-stat-card__value">{formatKES(summary.totalSavings)}</div>
              <div className="admin-stat-card__label">Total Savings Held</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': '#55308a' }}>
              <div className="admin-stat-card__value">{formatKES(summary.principalDisbursed)}</div>
              <div className="admin-stat-card__label">Principal Disbursed</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-gold)' }}>
              <div className="admin-stat-card__value">{formatKES(thisMonthRepayments)}</div>
              <div className="admin-stat-card__label">Repayments Received</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginTop: 2 }}>
                This month
              </div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': '#1f5e3a' }}>
              <div className="admin-stat-card__value">{formatKES(summary.interestEarned)}</div>
              <div className="admin-stat-card__label">Interest Earned</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginTop: 2 }}>
                {formatKES(summary.interestCollected)} collected
              </div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': '#0b6e99' }}>
              <div className="admin-stat-card__value">{formatKES(summary.repaidToDate)}</div>
              <div className="admin-stat-card__label">Repaid to Date</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-gold)' }}>
              <div className="admin-stat-card__value">{summary.pendingApplications}</div>
              <div className="admin-stat-card__label">Pending Applications</div>
            </div>
          </div>

          {/* Financial Trends — combined grouped-bar chart. */}
          <div className="admin-table-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600,
              color: 'var(--color-forest-deep)', marginBottom: 4,
            }}>
              Financial Trends
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 20 }}>
              Last 6 months. Loans vs Repayments vs Interest.
            </div>

            <CombinedTrend data={summary.monthlySeries} />
          </div>

          {/* Two-column layout — layout in styles.css under
              .dashboard-two-col (2fr 1fr on desktop, single column ≤900px). */}
          <div className="dashboard-two-col">
            <div className="admin-table-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
                  Recent Pending Applications
                </div>
                <Link to="/admin" style={{ fontSize: '0.82rem', color: 'var(--color-forest)', fontWeight: 500 }}>
                  View queue →
                </Link>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16 }}>
                {summary.pendingApplications} awaiting review
              </div>

              {summary.recentPendingApplications.length === 0 ? (
                <div style={{ color: 'rgba(31,36,33,0.5)', fontSize: '0.88rem', padding: '12px 0' }}>
                  No pending applications.
                </div>
              ) : (
                <table className="admin-table" style={{ marginLeft: -8 }}>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th style={{ textAlign: 'right' }}>Requested</th>
                      <th>Applied</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentPendingApplications.map((app) => (
                      <tr key={app.id}>
                        <td style={{ fontWeight: 500 }}>{app.memberName}</td>
                        <td style={{ textAlign: 'right' }}>{formatKES(app.principal)}</td>
                        <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                          {new Date(app.appliedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td>
                          <Link to="/admin" className="admin-btn admin-btn--approve" style={{ textDecoration: 'none', display: 'inline-block' }}>
                            Review →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="admin-table-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 16 }}>
                Staff Quick Actions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to="/admin" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', border: '1px solid var(--color-line)', borderRadius: 4,
                  textDecoration: 'none', color: 'var(--color-ink)', fontSize: '0.88rem',
                }}>
                  Review Approval Queue <span>→</span>
                </Link>
                <Link to="/admin/audit-trail" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', border: '1px solid var(--color-line)', borderRadius: 4,
                  textDecoration: 'none', color: 'var(--color-ink)', fontSize: '0.88rem',
                }}>
                  View Audit Trail <span>→</span>
                </Link>
                <Link to="/admin/members" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', border: '1px solid var(--color-line)', borderRadius: 4,
                  textDecoration: 'none', color: 'var(--color-ink)', fontSize: '0.88rem',
                }}>
                  New Member Entry <span>→</span>
                </Link>
                <Link to="/admin/reports" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', border: '1px solid var(--color-line)', borderRadius: 4,
                  textDecoration: 'none', color: 'var(--color-ink)', fontSize: '0.88rem',
                }}>
                  Generate Monthly Report <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </AdminLayout>
  );
}

export default Dashboard;