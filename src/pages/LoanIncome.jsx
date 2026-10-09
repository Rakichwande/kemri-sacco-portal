import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_OPTIONS = [
  { key: 'all', label: 'All Statuses' },
  { key: 'disbursed', label: 'Disbursed' },
  { key: 'repaid', label: 'Repaid' },
  { key: 'disbursing', label: 'Disbursing' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

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

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function LoanIncome() {
  const [loans, setLoans] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', from: '', to: '' });

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const qs = params.toString();
      const res = await fetch(`${API_BASE}/api/income/loans${qs ? `?${qs}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLoans(data.loans || []);
      setTotals(data.totals || null);
    } catch (err) {
      console.error('Loan income fetch error:', err);
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.from, filters.to]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const handleClear = () => {
    setFilters({ status: 'all', from: '', to: '' });
  };

  const hasActiveFilters =
    filters.status !== 'all' || filters.from !== '' || filters.to !== '';

  return (
    <AdminLayout
      title="Loan Income"
      lede="Per-loan breakdown of principal disbursed, expected interest, and amounts repaid."
    >
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Filter bar — status + disbursed date range. Auto-applies on
          change; no separate "Apply" button. Clear resets everything. */}
      <div className="admin-table-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(31,36,33,0.55)', marginBottom: 4 }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                width: '100%', padding: '7px 10px', border: '1px solid var(--color-line)',
                borderRadius: 4, fontSize: '0.85rem', background: '#fff', color: 'var(--color-ink)',
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(31,36,33,0.55)', marginBottom: 4 }}>
              Disbursed from
            </label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              style={{
                width: '100%', padding: '7px 10px', border: '1px solid var(--color-line)',
                borderRadius: 4, fontSize: '0.85rem', background: '#fff', color: 'var(--color-ink)',
              }}
            />
          </div>

          <div style={{ minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(31,36,33,0.55)', marginBottom: 4 }}>
              Disbursed to
            </label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              style={{
                width: '100%', padding: '7px 10px', border: '1px solid var(--color-line)',
                borderRadius: 4, fontSize: '0.85rem', background: '#fff', color: 'var(--color-ink)',
              }}
            />
          </div>

          <button
            onClick={handleClear}
            disabled={!hasActiveFilters}
            style={{
              padding: '7px 14px', border: '1px solid var(--color-line)',
              borderRadius: 4, background: '#fff', fontSize: '0.85rem',
              cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
              color: hasActiveFilters ? 'var(--color-ink)' : 'rgba(31,36,33,0.35)',
              opacity: hasActiveFilters ? 1 : 0.6,
            }}
          >
            Clear filters
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : loans.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No loans match the current filters.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Loan Ref</th>
                <th>Member</th>
                <th style={{ textAlign: 'right' }}>Principal</th>
                <th>Term</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Interest Expected</th>
                <th style={{ textAlign: 'right' }}>Repaid to Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--color-forest-deep)', fontWeight: 500 }}>
                    {loan.reference}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{loan.member_name}</div>
                    {loan.member_reference && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginTop: 2 }}>
                        {loan.member_reference}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatKES(loan.principal)}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.7)' }}>
                    {loan.tenure_months} mo
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                    {loan.interest_rate}%
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#1f5e3a' }}>
                    {formatKES(loan.interest_expected)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatKES(loan.total_repaid)}
                  </td>
                  <td>{statusBadge(loan.status)}</td>
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-line)', background: 'rgba(217,226,214,0.25)' }}>
                  <td colSpan={2} style={{ fontWeight: 600, padding: '12px 16px' }}>
                    Totals ({totals.count} loan{totals.count === 1 ? '' : 's'})
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatKES(totals.principal)}
                  </td>
                  <td></td>
                  <td></td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1f5e3a' }}>
                    {formatKES(totals.interest_expected)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatKES(totals.total_repaid)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default LoanIncome;