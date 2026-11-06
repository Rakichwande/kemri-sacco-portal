import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

function formatLoanType(purpose) {
  if (!purpose) return 'Mobile';
  if (purpose === 'bizboost') return 'BizBoost';
  if (purpose === 'sme') return 'SME';
  return purpose.charAt(0).toUpperCase() + purpose.slice(1).toLowerCase();
}

const LIFECYCLE_STATUSES = ['approved', 'disbursing', 'disbursed', 'repaid'];

// 2026-10-23: Replaced the ManualDisbursementModal with a simpler
// CreditWalletModal. Since money goes to the Wallet first, we don't
// need an M-Pesa receipt anymore.
function CreditWalletModal({ loan, onClose, onCredited }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/loans/disburse/${loan.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mpesaReceipt: 'Wallet Credit' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onCredited();
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 6, width: 440, maxWidth: '90vw', padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 4 }}>
          Process Disbursement
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
          Loan #{loan.id} · {formatKES(loan.principal)} to {loan.member_name}
        </div>

        <div style={{ padding: 12, background: '#fbf3e6', border: '1px solid #e8d4a8', borderRadius: 4, fontSize: '0.82rem', color: '#7a5a10', marginBottom: 16 }}>
          {['mobile', 'bizboost', 'sme'].includes(loan.purpose) ? (
            <span>This will mark the <strong>{formatKES(loan.principal)}</strong> loan as manually paid to the member's M-Pesa.</span>
          ) : (
            <span>This will credit <strong>{formatKES(loan.principal)}</strong> to the member's SACCO Wallet and send them an SMS. They will then dial *483*4444# to withdraw the funds.</span>
          )}
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="admin-btn admin-btn--approve" style={{ flex: 1 }}>
              {submitting ? 'Processing…' : 'Confirm & Process'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DisbursementLog() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loanType, setLoanType] = useState('all'); // 2026-11-06: Added filter state
  const [creditTarget, setCreditTarget] = useState(null);

  const canManageLoans = ['admin', 'sacco_admin', 'loans_officer'].includes(user?.role);

  const fetchLoans = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    if (showSpinner) setError(null);
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
      setLoans(data.filter((l) => LIFECYCLE_STATUSES.includes(l.status)));
    } catch (err) {
      console.error('Fetch disbursements error:', err);
      if (showSpinner) setError(friendlyErrorMessage(err));
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => { fetchLoans(); }, []);

  const handleCredited = () => {
    setCreditTarget(null);
    fetchLoans(false);
  };

  const filtered = loans.filter((l) => {
    // 2026-11-06: Filter by Loan Type
    if (loanType !== 'all' && l.purpose !== loanType) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matches = l.member_name?.toLowerCase().includes(q) || String(l.id).includes(q) || l.member_reference?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (dateFrom && l.disbursed_at && new Date(l.disbursed_at) < new Date(dateFrom)) return false;
    if (dateTo && l.disbursed_at && new Date(l.disbursed_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const handleReset = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setLoanType('all');
  };

  const awaiting = filtered.filter((l) => l.status === 'approved');
  const inFlight = filtered.filter((l) => l.status === 'disbursing');
  const completed = filtered.filter((l) => l.status === 'disbursed' || l.status === 'repaid');
  const totalDisbursed = completed.reduce((sum, l) => sum + Number(l.principal), 0);

  const totalOutstanding = completed
    .filter((l) => l.status === 'disbursed')
    .reduce((sum, l) => sum + Number(l.outstanding_balance || 0), 0);

  const statusBadge = (status) => {
    const colors = {
      approved: { background: 'var(--color-gold-soft)', color: '#7a5a10' },
      disbursing: { background: '#dde7f5', color: '#2a4a7a' },
      disbursed: { background: 'var(--color-sage)', color: 'var(--color-forest-deep)' },
      repaid: { background: '#e5e2da', color: 'rgba(31,36,33,0.55)' },
    };
    const style = colors[status] || { background: '#eee', color: '#333' };
    return <span className="admin-badge" style={style}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  const remainingCell = (l) => {
    if (l.status === 'approved' || l.status === 'disbursing') {
      return <span style={{ color: 'rgba(31,36,33,0.3)' }}>—</span>;
    }
    const outstanding = Number(l.outstanding_balance || 0);
    if (outstanding > 0) {
      return <span style={{ fontWeight: 500, color: '#a13030' }}>{formatKES(outstanding)}</span>;
    }
    return <span style={{ fontWeight: 500, color: 'var(--color-forest-deep)' }}>Cleared</span>;
  };

  return (
    <AdminLayout title="Loan Disbursements" lede="Approve-to-credit workflow — credit approved loans to members' SACCO Wallets or M-Pesa.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="admin-stat-card" style={{ '--stat-accent': '#7a5a10' }}>
          <div className="admin-stat-card__value">{awaiting.length}</div>
          <div className="admin-stat-card__label">Awaiting Action</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
          <div className="admin-stat-card__value">{completed.length}</div>
          <div className="admin-stat-card__label">Completed Loans</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': '#55308a' }}>
          <div className="admin-stat-card__value">{formatKES(totalDisbursed)}</div>
          <div className="admin-stat-card__label">Total Disbursed</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': '#a13030' }}>
          <div className="admin-stat-card__value">{formatKES(totalOutstanding)}</div>
          <div className="admin-stat-card__label">Total Outstanding</div>
        </div>
      </div>

      <div className="admin-table-card" style={{ padding: 16, marginBottom: 20 }}>
        {/* 2026-11-06: Updated grid to include the dropdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Search Member / Reference</div>
            <input
              type="text"
              placeholder="Member name or reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}
            />
          </div>
          
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Loan Type</div>
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem', background: '#fff', cursor: 'pointer' }}
            >
              <option value="all">All Types</option>
              <option value="mobile">Mobile</option>
              <option value="emergency">Emergency</option>
              <option value="school">School Fees</option>
              <option value="bizboost">BizBoost</option>
              <option value="sme">SME Loan</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Credited From</div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Credited To</div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem' }}
            />
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
      ) : filtered.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No loans match that filter.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Member</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Principal</th>
                <th>Term</th>
                <th style={{ textAlign: 'right' }}>Monthly</th>
                <th style={{ textAlign: 'right' }}>Remaining</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                // 2026-11-06: Added badge colors for new loan types
                let typeBg = '#e0f2fe', typeColor = '#0369a1'; // Mobile default
                if (l.purpose === 'emergency') { typeBg = '#ffedd5'; typeColor = '#c2410c'; }
                else if (l.purpose === 'school') { typeBg = '#f3e8ff'; typeColor = '#7e22ce'; }
                else if (l.purpose === 'bizboost') { typeBg = '#ccfbf1'; typeColor = '#0f766e'; }
                else if (l.purpose === 'sme') { typeBg = '#cffafe'; typeColor = '#0891b2'; }

                return (
                <tr key={l.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>#{l.id}</td>
                  <td style={{ fontWeight: 500 }}>
                    {l.member_name}
                    <div style={{ fontSize: '0.75rem', color: 'rgba(31,36,33,0.5)', fontFamily: 'var(--font-mono)' }}>{l.member_reference}</div>
                  </td>
                  <td>
                    <span style={{ background: typeBg, color: typeColor, padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      {formatLoanType(l.purpose)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatKES(l.principal)}</td>
                  <td>{l.tenure_months} mo</td>
                  <td style={{ textAlign: 'right' }}>{formatKES(l.monthly_installment)}</td>
                  <td style={{ textAlign: 'right' }}>{remainingCell(l)}</td>
                  <td>{statusBadge(l.status)}</td>
                  <td>
                    {l.status === 'approved' && canManageLoans && (
                      <button
                        onClick={() => setCreditTarget(l)}
                        className="admin-btn admin-btn--approve"
                        style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                      >
                        {['mobile', 'bizboost', 'sme'].includes(l.purpose) ? 'Process B2C' : 'Credit to Wallet'}
                      </button>
                    )}
                    {l.status === 'approved' && !canManageLoans && (
                      <span style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.4)' }}>Awaiting action</span>
                    )}
                    
                    {l.status === 'disbursing' && (
                      <span style={{ fontSize: '0.8rem', color: '#2a4a7a' }}>B2C In Flight</span>
                    )}
                    
                    {(l.status === 'disbursed' || l.status === 'repaid') && (
                      <span style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.4)' }}>—</span>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {creditTarget && (
        <CreditWalletModal
          loan={creditTarget}
          onClose={() => setCreditTarget(null)}
          onCredited={handleCredited}
        />
      )}
    </AdminLayout>
  );
}

export default DisbursementLog;