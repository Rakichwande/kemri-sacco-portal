import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function MemberDirectory() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/members`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setMembers(await res.json());
    } catch (err) {
      console.error('Fetch members error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.phone_number?.toLowerCase().includes(q) ||
      m.id_number?.toLowerCase().includes(q) ||
      m.employer?.toLowerCase().includes(q)
    );
  });

  const loanBadge = (status) => {
    if (!status) return <span style={{ color: 'rgba(31,36,33,0.4)', fontSize: '0.82rem' }}>No loan</span>;
    return <span className={`admin-badge admin-badge--${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  return (
    <AdminLayout title="Member Directory" lede={`${members.length} members · searchable register of all SACCO members.`}>
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <input
        type="text"
        placeholder="Search name, phone, National ID, employer…"
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
          No members match that search.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Phone</th>
                <th>National ID</th>
                <th>Employer</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Savings</th>
                <th>Loan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.full_name}</td>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>{m.phone_number}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{m.id_number}</td>
                  <td>{m.employer || '—'}</td>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                    {new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatKES(m.savings_balance)}</td>
                  <td>{loanBadge(m.current_loan_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default MemberDirectory;
