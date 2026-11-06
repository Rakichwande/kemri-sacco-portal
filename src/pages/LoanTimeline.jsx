import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatLoanType(purpose) {
  if (!purpose) return 'Mobile';
  if (purpose === 'bizboost') return 'BizBoost';
  if (purpose === 'sme') return 'SME';
  return purpose.charAt(0).toUpperCase() + purpose.slice(1).toLowerCase();
}

export default function LoanTimeline() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Default to current month and year
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loanType, setLoanType] = useState('all'); // 2026-11-06: Added filter state

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

  // 2026-11-06: Filter the timeline by selected loan type
  const filteredLoans = loans.filter(l => loanType === 'all' || l.purpose === loanType);

  return (
    <AdminLayout title="Loan Timeline Report" lede="Track the full lifecycle of every loan application by month.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
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

        {/* 2026-11-06: Added Loan Type Dropdown */}
        <select 
          value={loanType} 
          onChange={(e) => setLoanType(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-line)', borderRadius: 4 }}
        >
          <option value="all">All Loan Types</option>
          <option value="mobile">Mobile</option>
          <option value="emergency">Emergency</option>
          <option value="school">School Fees</option>
          <option value="bizboost">BizBoost</option>
          <option value="sme">SME Loan</option>
        </select>

        <span style={{ fontSize: '0.85rem', color: 'rgba(31,36,33,0.5)' }}>
          Found {filteredLoans.length} applications
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
                <th>Type</th>
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
              {filteredLoans.length === 0 ? (
                <tr>
                  {/* Updated colSpan from 9 to 10 to account for the new Type column */}
                  <td colSpan="10" style={{ textAlign: 'center', padding: 32, color: 'rgba(31,36,33,0.5)' }}>
                    No loans found for this selection.
                  </td>
                </tr>
              ) : (
                filteredLoans.map(l => {
                  // 2026-11-06: Added badge colors for new loan types
                  let typeBg = '#e0f2fe', typeColor = '#0369a1'; // Mobile default
                  if (l.purpose === 'emergency') { typeBg = '#ffedd5'; typeColor = '#c2410c'; }
                  else if (l.purpose === 'school') { typeBg = '#f3e8ff'; typeColor = '#7e22ce'; }
                  else if (l.purpose === 'bizboost') { typeBg = '#ccfbf1'; typeColor = '#0f766e'; }
                  else if (l.purpose === 'sme') { typeBg = '#cffafe'; typeColor = '#0891b2'; }

                  return (
                  <tr key={l.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-forest-deep)' }}>
                      {l.reference}
                    </td>
                    <td style={{ fontWeight: 500 }}>{l.member_name}</td>
                    <td>
                      <span style={{ background: typeBg, color: typeColor, padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        {formatLoanType(l.purpose)}
                      </span>
                    </td>
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
                )})
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}