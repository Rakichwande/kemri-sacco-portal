import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function LoanTimeline() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Default to current month and year
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/loans/timeline?year=${year}&month=${month}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch timeline');
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTimeline(); }, [month, year]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const months = [
    { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
    { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
    { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
    { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' }
  ];

  return (
    <AdminLayout title="Loan Timeline Report" lede="Track the full lifecycle of every loan application by month.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select 
          value={month} 
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid var(--color-line)', borderRadius: 4 }}
        >
          {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>

        <select 
          value={year} 
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid var(--color-line)', borderRadius: 4 }}
        >
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <span style={{ fontSize: '0.85rem', color: 'rgba(31,36,33,0.5)' }}>
          Found {loans.length} applications
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>Loading timeline...</div>
      ) : (
        <div className="admin-table-card" style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th>Loan Ref</th>
                <th>Member</th>
                <th style={{ textAlign: 'right' }}>Principal</th>
                <th>Status</th>
                <th>Applied At</th>
                <th>Approved At</th>
                <th>Disbursed At</th>
                <th>Rejected At</th>
                <th>Repaid At</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 32, color: 'rgba(31,36,33,0.5)' }}>
                    No loans found for this month.
                  </td>
                </tr>
              ) : (
                loans.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-forest-deep)' }}>
                      {l.reference}
                    </td>
                    <td style={{ fontWeight: 500 }}>{l.member_name}</td>
                    <td style={{ textAlign: 'right' }}>KES {Number(l.principal).toLocaleString()}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${l.status}`}>
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.7)' }}>{formatDate(l.applied_at)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.7)' }}>{formatDate(l.approved_at)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.7)' }}>{formatDate(l.disbursed_at)}</td>
                    <td style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{formatDate(l.rejected_at)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-forest)' }}>{formatDate(l.repaid_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}