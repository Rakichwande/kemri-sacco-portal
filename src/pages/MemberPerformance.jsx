import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function formatDate(iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', opts);
}

const STATUS_COLORS = {
  pending: { background: 'var(--color-gold-soft)', color: '#7a5a10' },
  approved: { background: 'var(--color-gold-soft)', color: '#7a5a10' },
  disbursing: { background: '#dde7f5', color: '#2a4a7a' },
  disbursed: { background: 'var(--color-sage)', color: 'var(--color-forest-deep)' },
  repaid: { background: '#e5e2da', color: 'rgba(31,36,33,0.55)' },
  rejected: { background: '#f2c8c8', color: '#8a2020' },
};

function statusBadge(status) {
  const colors = STATUS_COLORS[status] || { background: '#eee', color: '#333' };
  return (
    <span className="admin-badge" style={colors}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MemberPerformance() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/members/${id}/performance`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        setReport(await res.json());
      } catch (err) {
        console.error('Fetch member performance error:', err);
        setError(friendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const handlePrint = () => window.print();

  return (
    <AdminLayout>
      <style>{`
        .print-only { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 0;
          }

          .admin-table-card {
            box-shadow: none !important;
            border: 1px solid #c0c0c0 !important;
            background: #fff !important;
          }

          .print-only { display: block !important; }
          .print-hide { display: none !important; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          @page { margin: 15mm; }
        }
      `}</style>

      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <LoadingState />
      ) : !report ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No report available.
        </div>
      ) : (
        <div className="member-performance print-area">

          {/* Printable report header — hidden on screen. */}
          <div className="print-only" style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px solid #ccc', paddingBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600 }}>
              KEMRI SACCO
            </div>
            <div style={{ fontSize: '0.9rem', color: '#555' }}>Member Performance Report</div>
            <div style={{ fontSize: '0.78rem', color: '#777', marginTop: 4 }}>
              Generated {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* On-screen controls — hidden on print */}
          <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Link to="/admin/members" style={{ fontSize: '0.82rem', color: 'var(--color-forest)', textDecoration: 'none' }}>
              ← Back to Directory
            </Link>
            <button
              onClick={handlePrint}
              className="admin-btn admin-btn--approve"
              style={{ fontSize: '0.82rem', padding: '8px 16px' }}
            >
              Print Report
            </button>
          </div>

          {/* On-screen page title */}
          <div className="print-hide" style={{ marginBottom: 20 }}>
            <h1 className="admin-page-title">Member Performance</h1>
            <p className="admin-page-lede">
              Lifetime credit history, repayment reliability, and current financial position.
            </p>
          </div>

          {/* ─── MEMBER IDENTITY ─── */}
          <div className="admin-table-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 4 }}>
                  {report.member.full_name}
                  {report.member.is_board_staff && (
                    <span className="admin-badge" style={{
                      background: 'var(--color-gold-soft)', color: '#7a5a10',
                      fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase',
                      padding: '2px 6px', marginLeft: 10, verticalAlign: 'middle', fontWeight: 600,
                    }}>
                      Board/Staff
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'rgba(31,36,33,0.6)' }}>
                  Reference {report.member.reference}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: '4px 24px', fontSize: '0.85rem' }}>
                <div style={{ color: 'rgba(31,36,33,0.55)' }}>Phone</div>
                <div>{report.member.phone_number || '—'}</div>
                <div style={{ color: 'rgba(31,36,33,0.55)' }}>National ID</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{report.member.id_number || '—'}</div>
                <div style={{ color: 'rgba(31,36,33,0.55)' }}>Employer</div>
                <div>{report.member.employer || '—'}</div>
                <div style={{ color: 'rgba(31,36,33,0.55)' }}>Member since</div>
                <div>{formatDate(report.member.member_since)}</div>
                <div style={{ color: 'rgba(31,36,33,0.55)' }}>Credit limit</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{formatKES(report.member.credit_limit)}</div>
              </div>
            </div>
          </div>

          {/* ─── LIFETIME TOTALS — 6 cards ───
              Reorganized 2026-10-09: Principal and Interest each get their
              own card (previously they were buried in a "Repayment
              Breakdown" panel that duplicated Total Repaid). The panel is
              gone; its content now lives here.

              Layout breakpoints in styles.css under .performance-stat-row:
              6-across on wide screens, 3+3 on laptop, 2+2+2 on mobile. */}
          <div className="performance-stat-row">
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
              <div className="admin-stat-card__value">{formatKES(report.summary.total_borrowed)}</div>
              <div className="admin-stat-card__label">Total Borrowed</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-forest)' }}>
              <div className="admin-stat-card__value">{formatKES(report.summary.total_repaid)}</div>
              <div className="admin-stat-card__label">Total Repaid</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': '#55308a' }}>
              <div className="admin-stat-card__value">{formatKES(report.summary.total_principal_paid || 0)}</div>
              <div className="admin-stat-card__label">Principal Repaid</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': '#1f5e3a' }}>
              <div className="admin-stat-card__value">{formatKES(report.summary.total_interest_paid || 0)}</div>
              <div className="admin-stat-card__label">Interest Paid</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': '#a13030' }}>
              <div className="admin-stat-card__value">{formatKES(report.summary.current_outstanding)}</div>
              <div className="admin-stat-card__label">Current Outstanding</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': '#0b6e99' }}>
              <div className="admin-stat-card__value">{report.summary.loans_repaid}</div>
              <div className="admin-stat-card__label">Loans Fully Repaid</div>
            </div>
          </div>

          {/* ─── RELIABILITY PANEL ─── */}
          <div className="admin-table-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'var(--color-forest-deep)' }}>
              Repayment Reliability
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, fontSize: '0.88rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Loans Taken</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600 }}>{report.summary.total_loans}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Repaid On Time</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
                  {report.summary.on_time_repayments}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Repaid Late</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, color: report.summary.late_repayments > 0 ? '#a13030' : 'inherit' }}>
                  {report.summary.late_repayments}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Active / Rejected</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600 }}>
                  {report.summary.loans_active} / {report.summary.loans_rejected}
                </div>
              </div>
            </div>
            {report.summary.loans_repaid > 0 && (
              <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'rgba(31,36,33,0.5)' }}>
                "On time" means the loan was fully repaid within its tenure ({report.loans[0]?.tenure_months || 1} month{report.loans[0]?.tenure_months === 1 ? '' : 's'}) plus a 7-day grace period.
              </div>
            )}
          </div>

          {/* ─── CURRENT POSITION ─── */}
          <div className="admin-table-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'var(--color-forest-deep)' }}>
              Current Position
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Savings Balance</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
                  {formatKES(report.summary.savings_balance)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Loan Outstanding</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, color: report.summary.current_outstanding > 0 ? '#a13030' : 'inherit' }}>
                  {formatKES(report.summary.current_outstanding)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Net Position</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600,
                  color: report.summary.net_position >= 0 ? 'var(--color-forest-deep)' : '#a13030',
                }}>
                  {report.summary.net_position < 0 ? '-' : ''}{formatKES(Math.abs(report.summary.net_position))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── LOAN HISTORY ─── */}
          <div className="admin-table-card">
            <div style={{ padding: '16px 20px 4px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
                Loan History
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.5)', marginTop: 2 }}>
                {report.loans.length === 0
                  ? 'No loans on record.'
                  : `${report.loans.length} loan${report.loans.length === 1 ? '' : 's'}, most recent first.`}
              </div>
            </div>
            {report.loans.length > 0 && (
              <table className="admin-table" style={{ width: '100%', marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th style={{ textAlign: 'right' }}>Principal</th>
                    <th style={{ textAlign: 'right' }}>Repaid</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                    <th>Term</th>
                    <th>Applied</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.loans.map((loan) => {
                    const hasSplit =
                      Number(loan.amount_paid) > 0 &&
                      (Number(loan.principal_paid) > 0 || Number(loan.interest_paid) > 0);

                    return (
                      <tr key={loan.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-forest-deep)' }}>
                          {loan.reference}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatKES(loan.principal)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          <div>{formatKES(loan.amount_paid)}</div>
                          {hasSplit && (
                            <div style={{
                              fontSize: '0.68rem',
                              color: 'rgba(31,36,33,0.5)',
                              marginTop: 2,
                              fontWeight: 400,
                            }}>
                              P&nbsp;{formatKES(loan.principal_paid || 0)} · I&nbsp;{formatKES(loan.interest_paid || 0)}
                            </div>
                          )}
                        </td>
                        <td style={{
                          textAlign: 'right', fontFamily: 'var(--font-mono)',
                          color: loan.outstanding_balance > 0 ? '#a13030' : 'rgba(31,36,33,0.4)',
                        }}>
                          {loan.outstanding_balance > 0 ? formatKES(loan.outstanding_balance) : '—'}
                        </td>
                        <td>{loan.tenure_months} mo</td>
                        <td style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>{formatDate(loan.applied_at)}</td>
                        <td style={{ fontSize: '0.82rem' }}>
                          {loan.days_to_repay !== null
                            ? `${loan.days_to_repay}d`
                            : loan.status === 'disbursed'
                              ? 'In progress'
                              : '—'}
                          {loan.on_time === true && (
                            <span style={{ color: 'var(--color-forest-deep)', marginLeft: 6, fontSize: '0.72rem' }}>on-time</span>
                          )}
                          {loan.on_time === false && (
                            <span style={{ color: '#a13030', marginLeft: 6, fontSize: '0.72rem' }}>late</span>
                          )}
                        </td>
                        <td>{statusBadge(loan.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: 20, fontSize: '0.72rem', color: 'rgba(31,36,33,0.4)', textAlign: 'right' }}>
            Report generated {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default MemberPerformance;