import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';
import CombinedTrend from '../components/CombinedTrend';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        setSummary(await res.json());
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(friendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  // This month's repayments, pulled from the last entry of the monthly
  // series (the array always ends with the current month).
  const thisMonthRepayments = summary?.monthlySeries?.length
    ? summary.monthlySeries[summary.monthlySeries.length - 1].repayments
    : 0;

  return (
    <AdminLayout title="Dashboard" lede="SACCO-wide overview.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <LoadingState />
      ) : summary ? (
        <>
          {/* Seven-card stat row.
              - Members, Savings: structural totals
              - Principal Disbursed, Interest Earned, Repaid to Date: all-time
              - Repayments Received: this calendar month
              - Pending Applications: real-time count

              Grid layout (and its responsive breakpoints) lives in
              styles.css under .dashboard-stat-row. Previously this used
              inline gridTemplateColumns with auto-fit, which crams all 7
              cards into one row at ~1400px and forces KES values to wrap
              mid-number. Explicit breakpoints in CSS give predictable
              layouts: 7 / 4+3 / 3+3+1 / 2+2+2+1. */}
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

          {/* Financial Trends - Loans vs Repayments vs Interest, one combined
              chart. Replaces the three separate MiniTrend charts that used to
              occupy this card. */}
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
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