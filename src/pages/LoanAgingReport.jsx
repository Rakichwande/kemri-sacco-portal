import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// Bucket colour palette. Deliberately a progression — green → amber → red —
// so the aging table reads as a heatmap when scanned quickly. Uses the
// same colour tokens the rest of the portal already uses for status badges.
const BUCKET_COLORS = {
  current: { background: 'var(--color-sage)', color: 'var(--color-forest-deep)' },
  days_1_30: { background: 'var(--color-gold-soft)', color: '#7a5a10' },
  days_31_60: { background: '#f4e0c8', color: '#8a4a10' },
  days_61_90: { background: '#f2c8c8', color: '#8a2020' },
  days_90_plus: { background: '#e8a8a8', color: '#6a1010' },
};

function LoanAgingReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBucket, setExpandedBucket] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reports/aging`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setReport(await res.json());
    } catch (err) {
      console.error('Fetch aging report error:', err);
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const toggleBucket = (key) => {
    setExpandedBucket((prev) => (prev === key ? null : key));
  };

  return (
    <AdminLayout title="Loan Aging Report" lede="Outstanding loans grouped by how far behind schedule the member is.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <LoadingState />
      ) : !report ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No report available.
        </div>
      ) : (
        <>
          {/* Header row: as-of date + refresh */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)' }}>
              As of <strong style={{ fontFamily: 'var(--font-mono)' }}>{report.as_of}</strong>
            </div>
            <button
              onClick={fetchReport}
              style={{ padding: '7px 14px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>

          {/* Stat cards — four headline numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
              <div className="admin-stat-card__value">{report.totals.total_loans}</div>
              <div className="admin-stat-card__label">Active Loans</div>
            </div>
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-forest)' }}>
              <div className="admin-stat-card__value">{formatKES(report.totals.total_outstanding)}</div>
              <div className="admin-stat-card__label">Total Outstanding</div>
            </div>
            <div className="admin-stat-card" style={{ '--stat-accent': '#7a5a10' }}>
              <div className="admin-stat-card__value">{report.totals.overdue_count}</div>
              <div className="admin-stat-card__label">Overdue Loans</div>
            </div>
            <div className="admin-stat-card" style={{ '--stat-accent': '#a13030' }}>
              <div className="admin-stat-card__value">{formatKES(report.totals.overdue_behind)}</div>
              <div className="admin-stat-card__label">Amount Behind Schedule</div>
            </div>
          </div>

          {/* Aging table — one row per bucket, clickable to expand */}
          <div className="admin-table-card">
            <table className="admin-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 20 }}></th>
                  <th>Bucket</th>
                  <th style={{ textAlign: 'right' }}>Loans</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th style={{ textAlign: 'right' }}>Amount Behind</th>
                </tr>
              </thead>
              <tbody>
                {report.buckets.map((bucket) => {
                  const colors = BUCKET_COLORS[bucket.key] || BUCKET_COLORS.current;
                  const isExpanded = expandedBucket === bucket.key;
                  const isClickable = bucket.count > 0;
                  return (
                    <React.Fragment key={bucket.key}>
                      <tr
                        onClick={() => isClickable && toggleBucket(bucket.key)}
                        style={{
                          cursor: isClickable ? 'pointer' : 'default',
                          background: isExpanded ? '#f7f7f3' : 'transparent',
                        }}
                      >
                        <td style={{ textAlign: 'center', color: 'rgba(31,36,33,0.4)', fontSize: '0.8rem' }}>
                          {isClickable ? (isExpanded ? '▾' : '▸') : ''}
                        </td>
                        <td>
                          <span className="admin-badge" style={colors}>{bucket.label}</span>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(31,36,33,0.5)', marginTop: 2 }}>
                            {bucket.description}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{bucket.count}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatKES(bucket.total_outstanding)}</td>
                        <td style={{
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          color: bucket.total_behind > 0 ? '#a13030' : 'rgba(31,36,33,0.4)',
                        }}>
                          {bucket.total_behind > 0 ? formatKES(bucket.total_behind) : '—'}
                        </td>
                      </tr>
                      {isExpanded && bucket.loans.length > 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0, background: '#f7f7f3' }}>
                            <div style={{ padding: '12px 24px 16px' }}>
                              <table style={{ width: '100%', fontSize: '0.82rem' }}>
                                <thead>
                                  <tr style={{ color: 'rgba(31,36,33,0.5)', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 0', fontWeight: 500 }}>Reference</th>
                                    <th style={{ padding: '6px 0', fontWeight: 500 }}>Member</th>
                                    <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>Outstanding</th>
                                    <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>Paid</th>
                                    <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>Behind</th>
                                    <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>Days Late</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bucket.loans.map((loan) => (
                                    <tr key={loan.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                                      <td style={{ padding: '6px 0', fontFamily: 'var(--font-mono)' }}>{loan.reference}</td>
                                      <td style={{ padding: '6px 0' }}>
                                        {loan.member_name}
                                        <span style={{ color: 'rgba(31,36,33,0.5)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                                          {loan.member_reference}
                                        </span>
                                      </td>
                                      <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatKES(loan.outstanding_balance)}</td>
                                      <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatKES(loan.amount_paid)}</td>
                                      <td style={{
                                        padding: '6px 0',
                                        textAlign: 'right',
                                        fontFamily: 'var(--font-mono)',
                                        color: loan.amount_behind > 0 ? '#a13030' : 'rgba(31,36,33,0.4)',
                                      }}>
                                        {loan.amount_behind > 0 ? formatKES(loan.amount_behind) : '—'}
                                      </td>
                                      <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                        {loan.days_late > 0 ? `${loan.days_late}d` : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footnote explaining the tolerance model, so staff reading the
              report understand why a loan showing 3 days late on its due
              date still appears under "Current." */}
          <div style={{ marginTop: 20, fontSize: '0.78rem', color: 'rgba(31,36,33,0.5)', lineHeight: 1.5 }}>
            <strong>How buckets are calculated:</strong> a loan is "behind" when the cumulative amount paid falls more than
            one full instalment below the cumulative schedule. This means a member who pays a few days late — but stays within
            one instalment of their schedule — still shows under <em>Current</em>. Days late is measured from the month the
            member crossed that threshold.
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export default LoanAgingReport;