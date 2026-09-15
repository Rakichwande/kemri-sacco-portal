import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function RepaymentHistory() {
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [channel, setChannel] = useState('all');

  const fetchRepayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo + 'T23:59:59');
      if (channel !== 'all') params.set('channel', channel);
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
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchRepayments, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFrom, dateTo, channel]);

  const handleReset = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setChannel('all');
  };

  const totalReceived = repayments.reduce((sum, r) => sum + Number(r.amount), 0);
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-body)' };
  const dateStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem' };
  const labelStyle = { fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 };

  return (
    <AdminLayout title="Loan Repayment History" lede="Complete history of loan repayments received — filter by loan reference or transaction date.">
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

      <div className="admin-table-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <div style={labelStyle}>Search Loan Reference / Member</div>
            <input type="text" placeholder="Loan ref or member name…" value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>From</div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={dateStyle} />
          </div>
          <div>
            <div style={labelStyle}>To</div>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={dateStyle} />
          </div>
          <div>
            <div style={labelStyle}>Channel</div>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ ...dateStyle, background: '#fff' }}>
              <option value="all">All channels</option>
              <option value="mpesa">M-Pesa</option>
            </select>
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
      ) : repayments.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No repayments match these filters. Note this table only started filling once the repayments
          feature shipped — repayments made before that aren't recorded here individually.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Reference</th>
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
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>{r.member_reference}</td>
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
