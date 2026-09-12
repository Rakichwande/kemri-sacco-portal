import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function DisbursementLog() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  const filtered = loans.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.member_name?.toLowerCase().includes(q) || String(l.id).includes(q);
  });

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

      <input
        type="text"
        placeholder="Search member or loan ID…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '9px 12px', border: '1px solid var(--color-line)',
          borderRadius: 4, fontSize: '0.88rem', marginBottom: 20, fontFamily: 'var(--font-body)',
        }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(31,36,33,0.5)' }}>Loading…</div>
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
