import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function DisbursementLog() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/loans/admin/list`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Disbursement Log covers every loan that has actually had funds move -
      // disbursed or fully repaid - not pending/approved/rejected ones.
      setLoans(data.filter((l) => l.status === 'disbursed' || l.status === 'repaid'));
    } catch (err) {
      console.error('Fetch disbursements error:', err);
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  const filtered = loans.filter((l) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches = l.member_name?.toLowerCase().includes(q) || String(l.id).includes(q) || l.member_reference?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (dateFrom && (!l.disbursed_at || new Date(l.disbursed_at) < new Date(dateFrom))) return false;
    if (dateTo && (!l.disbursed_at || new Date(l.disbursed_at) > new Date(dateTo + 'T23:59:59'))) return false;
    return true;
  });

  const handleReset = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const totalDisbursed = filtered.reduce((sum, l) => sum + Number(l.principal), 0);
  const avgPerLoan = filtered.length ? totalDisbursed / filtered.length : 0;

  return (
    <AdminLayout title="Loan Disbursement Log" lede="Every loan disbursed — funds moved from the SACCO to members.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
          <div className="admin-stat-card__value">{filtered.length}</div>
          <div className="admin-stat-card__label">Disbursed Loans</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': '#55308a' }}>
          <div className="admin-stat-card__value">{formatKES(totalDisbursed)}</div>
          <div className="admin-stat-card__label">Total Disbursed</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-forest)' }}>
          <div className="admin-stat-card__value">{formatKES(Math.round(avgPerLoan))}</div>
          <div className="admin-stat-card__label">Average Per Loan</div>
        </div>
      </div>

      <div className="admin-table-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Search Member / Reference</div>
            <input
              type="text"
              placeholder="Member name or reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Disbursed From</div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Disbursed To</div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem' }}
            />
          </div>
          <button
            onClick={handleReset}
            style={{ padding: '9px 16px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No disbursements match that search.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Member</th>
                <th>Reference</th>
                <th style={{ textAlign: 'right' }}>Principal</th>
                <th>Term</th>
                <th style={{ textAlign: 'right' }}>Monthly</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>#{l.id}</td>
                  <td style={{ fontWeight: 500 }}>{l.member_name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>{l.member_reference}</td>
                  <td style={{ textAlign: 'right' }}>{formatKES(l.principal)}</td>
                  <td>{l.tenure_months} mo</td>
                  <td style={{ textAlign: 'right' }}>{formatKES(l.monthly_installment)}</td>
                  <td><span className={`admin-badge admin-badge--${l.status}`}>{l.status.charAt(0).toUpperCase() + l.status.slice(1)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default DisbursementLog;
