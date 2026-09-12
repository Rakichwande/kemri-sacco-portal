import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function ContributionLogs() {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchContributions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`${API_BASE}/api/payments/admin/list?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setContributions(await res.json());
    } catch (err) {
      console.error('Fetch contributions error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchContributions, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalCollected = contributions.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <AdminLayout title="Contribution Logs" lede="Every contribution received from members — verify incoming funds by member or date.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
          <div className="admin-stat-card__value">{contributions.length}</div>
          <div className="admin-stat-card__label">Matching Contributions</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-forest)' }}>
          <div className="admin-stat-card__value">{formatKES(totalCollected)}</div>
          <div className="admin-stat-card__label">Total Collected (filtered)</div>
        </div>
      </div>

      <input
        type="text"
        placeholder="Name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '9px 12px', border: '1px solid var(--color-line)',
          borderRadius: 4, fontSize: '0.88rem', marginBottom: 20, fontFamily: 'var(--font-body)',
        }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(31,36,33,0.5)' }}>Loading…</div>
      ) : contributions.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No contributions match that search.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Reference</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => (
                <tr key={c.id}>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.member_name || `Member #${c.member_id}`}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{c.mpesa_receipt || c.account_reference}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatKES(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default ContributionLogs;
