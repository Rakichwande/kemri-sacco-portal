import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CATEGORIES = [
  { value: 'all', label: 'All categories' },
  { value: 'loan_decision', label: 'Loan decisions' },
  { value: 'member_edit', label: 'Member edits' },
];

function AuditTrail() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const getToken = () => localStorage.getItem('token');

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (category !== 'all') params.set('category', category);

      const res = await fetch(`${API_BASE}/api/audit-log?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setEntries(await res.json());
    } catch (err) {
      console.error('Fetch audit log error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchEntries, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const formatTimestamp = (iso) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const categoryStyle = (cat) => {
    const map = {
      loan_decision: { background: '#d6e4f0', color: '#1c4a75' },
      member_edit: { background: 'var(--color-gold-soft)', color: '#7a5a10' },
    };
    return map[cat] || { background: 'var(--color-sage)', color: 'var(--color-forest-deep)' };
  };

  return (
    <AdminLayout
      title="Audit Trail"
      lede="Sensitive actions performed by staff — loan decisions and member record changes."
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Actor, action, target, details…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '9px 12px', border: '1px solid var(--color-line)',
            borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-body)',
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: '9px 12px', border: '1px solid var(--color-line)',
            borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-body)', background: '#fff',
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(31,36,33,0.5)' }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No matching audit entries.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'rgba(31,36,33,0.6)' }}>{formatTimestamp(e.created_at)}</td>
                  <td style={{ fontWeight: 500 }}>{e.actor_username}</td>
                  <td>
                    <span className="admin-badge" style={categoryStyle(e.category)}>{e.action}</span>
                  </td>
                  <td>{e.target_label || `${e.target_type} #${e.target_id}`}</td>
                  <td style={{ color: 'rgba(31,36,33,0.7)' }}>{e.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default AuditTrail;
