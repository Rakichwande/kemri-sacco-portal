import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function FinancialReports() {
  const [periodType, setPeriodType] = useState('month');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildParams = () => {
    const params = new URLSearchParams({ periodType, year });
    if (periodType === 'month') params.set('month', month);
    if (periodType === 'quarter') params.set('quarter', quarter);
    return params;
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reports/financial?${buildParams().toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setSummary(await res.json());
    } catch (err) {
      console.error('Fetch report error:', err);
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [periodType, year, month, quarter]);

  const handleExportCsv = () => {
    const token = localStorage.getItem('token');
    // Direct downloads can't carry an Authorization header, so fetch the
    // file with the token and trigger the save via a blob instead.
    fetch(`${API_BASE}/api/reports/financial/export?${buildParams().toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kemri-sacco-financial-report.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => alert('Export failed: ' + err.message));
  };

  const selectStyle = { padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem', background: '#fff' };
  const periodLabel = periodType === 'month'
    ? `${MONTHS[month - 1]} ${year}`
    : periodType === 'quarter'
      ? `Q${quarter} ${year}`
      : `${year}`;

  return (
    <AdminLayout title="Financial Reports" lede="SACCO-wide aggregate figures, filterable by period.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Period Type</div>
            <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} style={selectStyle}>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Year</div>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {periodType === 'month' && (
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Month</div>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
          {periodType === 'quarter' && (
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Quarter</div>
              <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} style={selectStyle}>
                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)' }}>Selected Period</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>{periodLabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="admin-btn admin-btn--disburse" onClick={handleExportCsv}>Download CSV</button>
      </div>

      {loading ? (
        <LoadingState />
      ) : summary ? (
        <>
          {/* Four stat cards.
              2026-10-12: added Interest Accrued and split the repayments
              card so the board sees profit vs capital recovery at a glance.
              Before this change the page showed only three flow figures —
              a KES 9,347 "Repayments Received" was misread as profit when
              only KES 400 of it was. */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-forest)' }}>
              <div className="admin-stat-card__value">{formatKES(summary.contributionsCollected)}</div>
              <div className="admin-stat-card__label">Contributions Collected</div>
            </div>

            <div className="admin-stat-card" style={{ '--stat-accent': '#55308a' }}>
              <div className="admin-stat-card__value">{formatKES(summary.loansDisbursed)}</div>
              <div className="admin-stat-card__label">Loans Disbursed</div>
            </div>

            {/* Interest Accrued — the profit figure. Interest earned on
                loans disbursed during this period, regardless of whether
                the member has repaid yet. Sub-line shows how much has
                actually been collected in cash. */}
            <div className="admin-stat-card" style={{ '--stat-accent': '#1f5e3a' }}>
              <div className="admin-stat-card__value">{formatKES(summary.interestAccrued)}</div>
              <div className="admin-stat-card__label">Interest Accrued</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginTop: 2 }}>
                {formatKES(summary.interestCollected)} collected
              </div>
            </div>

            {/* Repayments Received — total cash back in. Sub-line splits
                it into principal (return of SACCO capital) vs interest
                (profit). This is the key distinction the board asked for. */}
            <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-gold)' }}>
              <div className="admin-stat-card__value">{formatKES(summary.repaymentsReceived)}</div>
              <div className="admin-stat-card__label">Repayments Received</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginTop: 2 }}>
                {formatKES(summary.principalRepaid)} principal · {formatKES(summary.interestCollected)} interest
              </div>
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 4 }}>
              Period Breakdown
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16 }}>
              Monthly volume within the selected period.
            </div>
            <table className="admin-table" style={{ marginLeft: -8 }}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Contributions</th>
                  <th style={{ textAlign: 'right' }}>Disbursed</th>
                  <th style={{ textAlign: 'right' }}>Interest Accrued</th>
                  <th style={{ textAlign: 'right' }}>Repayments</th>
                  <th style={{ textAlign: 'right' }}>Principal</th>
                  <th style={{ textAlign: 'right' }}>Interest</th>
                </tr>
              </thead>
              <tbody>
                {summary.breakdown.map((row) => (
                  <tr key={row.month}>
                    <td style={{ fontWeight: 500 }}>{row.month}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatKES(row.contributions)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatKES(row.disbursed)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#1f5e3a', fontWeight: 500 }}>
                      {formatKES(row.interestAccrued)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatKES(row.repayments)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'rgba(31,36,33,0.65)' }}>
                      {formatKES(row.principalRepaid)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#1f5e3a', fontWeight: 500 }}>
                      {formatKES(row.interestCollected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.45)', marginTop: 16 }}>
            <strong>Interest Accrued</strong> is profit earned on loans disbursed this period (accrual basis).
            <strong> Interest</strong> under Repayments is profit actually received in cash.
            For a 1-month loan settled on time the two coincide; for late payments they land in different months.
            Dividend accrual isn't included — no dividend formula is defined anywhere in the system yet.
            PDF export isn't built yet either; CSV covers the same data for now.
          </p>
        </>
      ) : null}
    </AdminLayout>
  );
}

export default FinancialReports;