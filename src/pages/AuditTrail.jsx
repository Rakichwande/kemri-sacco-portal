import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CATEGORIES = [
  { value: 'all', label: 'All categories' },
  { value: 'loan_decision', label: 'Loan decisions' },
  { value: 'member_edit', label: 'Member edits' },
];

function AuditTrail() {
  const { user, logout } = useAuth();
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error('Fetch audit log error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Refetch whenever the filters change (debounced slightly for the search box)
  useEffect(() => {
    const t = setTimeout(fetchEntries, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const formatTimestamp = (iso) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const categoryColor = (cat) => {
    const colors = {
      loan_decision: 'bg-blue-100 text-blue-800',
      member_edit: 'bg-amber-100 text-amber-800',
    };
    return colors[cat] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🕘 Audit Trail</h1>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900 underline">
            Loans
          </Link>
          <span className="text-sm text-gray-600">Welcome, {user?.full_name || 'Admin'}</span>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Sensitive actions performed by staff — loan decisions and member record changes.
      </p>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Actor, action, target, details…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No matching audit entries.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actor</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Target</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatTimestamp(e.created_at)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{e.actor_username}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${categoryColor(e.category)}`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{e.target_label || `${e.target_type} #${e.target_id}`}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AuditTrail;
