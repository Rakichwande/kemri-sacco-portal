import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// Small dependency-free grouped bar chart - no charting library is installed
// yet, and pulling one in for a single chart isn't worth the bundle size.
function ComparisonChart({ data }) {
  const max = Math.max(...data.flatMap((d) => [d.contributions, d.repayments]), 1);
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: '0.8rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-forest)', display: 'inline-block' }} />
          Contributions
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-gold)', display: 'inline-block' }} />
          Repayments
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, padding: '0 4px' }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
              <div
                title={formatKES(d.contributions)}
                style={{
                  width: 16,
                  height: Math.max((d.contributions / max) * 110, d.contributions > 0 ? 4 : 2),
                  background: d.contributions > 0 ? 'var(--color-forest)' : 'var(--color-line)',
                  borderRadius: '3px 3px 0 0',
                }}
              />
              <div
                title={formatKES(d.repayments)}
                style={{
                  width: 16,
                  height: Math.max((d.repayments / max) * 110, d.repayments > 0 ? 4 : 2),
                  background: d.repayments > 0 ? 'var(--color-gold)' : 'var(--color-line)',
                  borderRadius: '3px 3px 0 0',
                }}
              />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.6)' }}>{d.label}</div>
          </div>
        ))}
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
        setError(err.message);
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
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(31,36,33,0.5)' }}>Loading…</div>
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

          <div className="admin-table-card" style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 4 }}>
              Contributions vs Repayments
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16 }}>
              Last 6 months.
            </div>
            <ComparisonChart data={summary.monthlySeries} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 24 }}>
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
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', border: '1px solid var(--color-line)', borderRadius: 4,
                  color: 'rgba(31,36,33,0.35)', fontSize: '0.88rem',
                }}>
                  New Member Entry <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', textTransform: 'uppercase' }}>Soon</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', border: '1px solid var(--color-line)', borderRadius: 4,
                  color: 'rgba(31,36,33,0.35)', fontSize: '0.88rem',
                }}>
                  Generate Monthly Report <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', textTransform: 'uppercase' }}>Soon</span>
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.45)', marginTop: 16 }}>
            Dividend accrual and available liquidity aren't shown — neither has a defined formula
            or policy anywhere in the system yet, so any number here would be invented, not real.
          </p>
        </>
      ) : null}
    </AdminLayout>
  );
}

export default Dashboard;
