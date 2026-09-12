import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATS_CONFIG = [
  { key: 'total', label: 'Total Loans', accent: 'var(--color-ink)' },
  { key: 'pending', label: 'Pending', accent: 'var(--color-gold)' },
  { key: 'approved', label: 'Approved', accent: '#1c4a75' },
  { key: 'disbursed', label: 'Disbursed', accent: '#55308a' },
  { key: 'repaid', label: 'Repaid', accent: 'var(--color-forest)' },
  { key: 'rejected', label: 'Rejected', accent: 'var(--color-error)' },
];

function AdminLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, disbursed: 0, repaid: 0, rejected: 0 });
  const [receipt, setReceipt] = useState({});

  const getToken = () => localStorage.getItem('token');

  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error('No token found');
      const res = await fetch(`${API_BASE}/api/loans/admin/list`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLoans(data);
      setStats({
        total: data.length,
        pending: data.filter((l) => l.status === 'pending').length,
        approved: data.filter((l) => l.status === 'approved').length,
        disbursed: data.filter((l) => l.status === 'disbursed').length,
        repaid: data.filter((l) => l.status === 'repaid').length,
        rejected: data.filter((l) => l.status === 'rejected').length,
      });
    } catch (err) {
      console.error('Fetch loans error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  const handleApprove = async (loanId) => {
    if (!window.confirm('Approve this loan?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/approve/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminNotes: 'Approved via Admin' }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      fetchLoans();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleReject = async (loanId) => {
    const adminNotes = window.prompt('Reason for rejecting this loan (shown to the member):', '');
    if (adminNotes === null) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/reject/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminNotes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject');
      }
      fetchLoans();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDisburse = async (loanId) => {
    const mpesaReceipt = receipt[loanId]?.trim() || '';
    if (!mpesaReceipt && !window.confirm('No receipt entered. Continue?')) return;
    if (!window.confirm('Mark as disbursed?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/disburse/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mpesaReceipt: mpesaReceipt || 'Manual Transfer' }),
      });
      if (!res.ok) throw new Error('Failed to disburse');
      setReceipt({ ...receipt, [loanId]: '' });
      fetchLoans();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const formatKES = (amount) => `KES ${Number(amount).toLocaleString()}`;

  const badgeClass = (status) => `admin-badge admin-badge--${status}`;

  return (
    <AdminLayout
      title="Loan Approval Queue"
      lede="Review applications and action approvals, rejections, and disbursements."
    >
      {error && (
        <div className="error-banner" style={{ marginBottom: 24 }}>
          {error}
          <div style={{ marginTop: 8 }}>
            <button className="admin-btn admin-btn--approve" onClick={fetchLoans}>Retry</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
        {STATS_CONFIG.map((s) => (
          <div className="admin-stat-card" style={{ '--stat-accent': s.accent }} key={s.key}>
            <div className="admin-stat-card__value">{stats[s.key]}</div>
            <div className="admin-stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(31,36,33,0.5)' }}>Loading…</div>
      ) : loans.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No loans found. Apply for a test loan via USSD (Option 4) to see it here.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Member</th>
                <th>Phone</th>
                <th style={{ textAlign: 'right' }}>Principal</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Monthly</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>#{loan.id}</td>
                  <td style={{ fontWeight: 500 }}>{loan.member_name || loan.member_id}</td>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>{loan.phone_number || 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>{formatKES(loan.principal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatKES(loan.total_repayment)}</td>
                  <td style={{ textAlign: 'right' }}>{formatKES(loan.monthly_installment)}</td>
                  <td>
                    <span className={badgeClass(loan.status)}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    {loan.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="admin-btn admin-btn--approve" onClick={() => handleApprove(loan.id)}>Approve</button>
                        <button className="admin-btn admin-btn--reject" onClick={() => handleReject(loan.id)}>Reject</button>
                      </div>
                    )}
                    {loan.status === 'approved' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 160 }}>
                        <input
                          type="text"
                          placeholder="M-Pesa Receipt"
                          value={receipt[loan.id] || ''}
                          onChange={(e) => setReceipt({ ...receipt, [loan.id]: e.target.value })}
                          style={{
                            padding: '6px 8px', border: '1px solid var(--color-line)',
                            borderRadius: 4, fontSize: '0.82rem',
                          }}
                        />
                        <button className="admin-btn admin-btn--disburse" onClick={() => handleDisburse(loan.id)}>Disburse</button>
                      </div>
                    )}
                    {loan.status === 'disbursed' && <span style={{ color: 'var(--color-forest)', fontSize: '0.85rem' }}>Disbursed</span>}
                    {loan.status === 'repaid' && <span style={{ color: 'rgba(31,36,33,0.55)', fontSize: '0.85rem' }}>Repaid</span>}
                    {loan.status === 'rejected' && <span style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>Rejected</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminLoans;
