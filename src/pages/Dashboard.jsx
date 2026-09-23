import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// Single-series mini bar chart. Each series gets its own scale (its own
// max), so a low-volume series (e.g. early loan disbursements) stays
// readable instead of being flattened by a large one (e.g. accumulated
// contributions). Compact by design: 100px bars, no per-bar tooltip chrome
// beyond the browser's native title attribute.
function MiniTrend({ title, accent, data, valueKey }) {
  const values = data.map((d) => d[valueKey] || 0);
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const peak = Math.max(...values);
  const hasAnyActivity = values.some((v) => v > 0);

  return (
    <div>
      <div style={{
        fontSize: '0.88rem', fontWeight: 600,
        color: 'var(--color-forest-deep)', marginBottom: 2,
      }}>
        {title}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginBottom: 12 }}>
        {hasAnyActivity
          ? `${formatKES(total)} · peak ${formatKES(peak)}`
          : 'No activity in the last 6 months'}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, padding: '0 2px' }}>
        {data.map((d) => {
          const value = d[valueKey] || 0;
          const height = Math.max((value / max) * 100, value > 0 ? 5 : 2);
          return (
            <div key={d.label} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6,
            }}>
              <div
                title={formatKES(value)}
                style={{
                  width: '80%', maxWidth: 22, height,
                  background: value > 0 ? accent : 'var(--color-line)',
                  borderRadius: '3px 3px 0 0',
                }}
              />
              <div style={{ fontSize: '0.68rem', color: 'rgba(31,36,33,0.5)' }}>{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
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

  return (
    <AdminLayout title="Dashboard" lede="SACCO-wide overview.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <LoadingState />
      ) : summary ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
              <div className="admin-stat-card__value">{summary.totalMembers}</div>
              <div className="admin-stat-card__label">Total Members</div>
            </div>
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-forest)' }}>
              <div className="admin-stat-card__value">{formatKES(summary.totalSavings)}</div>
              <div className="admin-stat-card__label">Total Savings Held</div>
            </div>
            <div className="admin-stat-card" style={{ '--stat-accent': '#55308a' }}>
              <div className="admin-stat-card__value">{formatKES(summary.loansOutstanding)}</div>
              <div className="admin-stat-card__label">Loans Outstanding</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginTop: 2 }}>
                {formatKES(summary.repaidToDate)} repaid to date
              </div>
            </div>
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-gold)' }}>
              <div className="admin-stat-card__value">{summary.pendingApplications}</div>
              <div className="admin-stat-card__label">Pending Applications</div>
            </div>
          </div>

          {/* Financial Trends - one card, three mini charts side-by-side */}
          <div className="admin-table-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600,
              color: 'var(--color-forest-deep)', marginBottom: 4,
            }}>
              Financial Trends
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 20 }}>
              Last 6 months.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
              <MiniTrend
                title="Contributions"
                accent="var(--color-forest)"
                data={summary.monthlySeries}
                valueKey="contributions"
              />
              <MiniTrend
                title="Loans Disbursed"
                accent="#55308a"
                data={summary.monthlySeries}
                valueKey="loans"
              />
              <MiniTrend
                title="Repayments"
                accent="var(--color-gold)"
                data={summary.monthlySeries}
                valueKey="repayments"
              />
            </div>
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
                <Link to="/admin/withdrawals" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', border: '1px solid var(--color-line)', borderRadius: 4,
                  textDecoration: 'none', color: 'var(--color-ink)', fontSize: '0.88rem',
                }}>
                  Process Withdrawals <span>→</span>
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