import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function RepaymentHistory() {
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchRepayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${API_BASE}/api/repayments?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setRepayments(await res.json());
    } catch (err) {
      console.error('Fetch repayments error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchRepayments, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalReceived = repayments.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <AdminLayout title="Loan Repayment History" lede="Complete history of loan repayments received — filter by loan reference or member.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
          <div className="admin-stat-card__value">{repayments.length}</div>
          <div className="admin-stat-card__label">Matching Repayments</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-gold)' }}>
          <div className="admin-stat-card__value">{formatKES(totalReceived)}</div>
          <div className="admin-stat-card__label">Total Received (filtered)</div>
        </div>
      </div>

      <input
        type="text"
        placeholder="Loan reference or member name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '9px 12px', border: '1px solid var(--color-line)',
          borderRadius: 4, fontSize: '0.88rem', marginBottom: 20, fontFamily: 'var(--font-body)',
        }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(31,36,33,0.5)' }}>Loading…</div>
      ) : repayments.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No repayments recorded yet. This table only started filling once the repayments
          feature shipped — repayments made before that aren't recorded here individually.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Loan Reference</th>
                <th>Channel</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.member_name || `Member #${r.member_id}`}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>KEMRI-L{r.loan_id}</td>
                  <td>
                    <span className="admin-badge" style={{ background: 'var(--color-sage)', color: 'var(--color-forest-deep)' }}>
                      {r.channel}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatKES(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default RepaymentHistory;
