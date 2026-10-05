import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// Loans shown on this page span the whole post-approval lifecycle:
//   approved   → money hasn't moved; staff can disburse (auto or manual)
//   disbursing → B2C request accepted by Safaricom, awaiting callback
//   disbursed  → money sent; historical record
//   repaid     → fully repaid; historical record
//
// Anything upstream of 'approved' (pending, rejected) belongs in the
// Approval Queue — this page doesn't show those.
const LIFECYCLE_STATUSES = ['approved', 'disbursing', 'disbursed', 'repaid'];


// Manual disbursement modal. Staff have already sent the money to the
// member themselves (via the M-Pesa app, bank transfer, whatever) and are
// recording the receipt here. Kept as a separate modal rather than inline
// because entering a receipt is a deliberate action — a modal makes the
// commit explicit.
function ManualDisbursementModal({ loan, onClose, onDisbursed }) {
  const [receipt, setReceipt] = useState('');
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
        body: JSON.stringify({ mpesaReceipt: receipt.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onDisbursed();
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
          Record manual disbursement
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
          Loan #{loan.id} · {formatKES(loan.principal)} to {loan.member_name}
        </div>

        <div style={{ padding: 12, background: '#fbf3e6', border: '1px solid #e8d4a8', borderRadius: 4, fontSize: '0.82rem', color: '#7a5a10', marginBottom: 16 }}>
          Confirm you have already sent {formatKES(loan.principal)} to the member's M-Pesa. Recording this here will mark the loan as disbursed, increment the member's outstanding balance, and send them a confirmation SMS.
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>
            M-Pesa receipt (optional)
          </div>
          <input
            type="text"
            autoFocus
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
            placeholder="e.g. SJK4X7Y2N1"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-mono)', marginBottom: 16 }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="admin-btn admin-btn--approve" style={{ flex: 1 }}>
              {submitting ? 'Recording…' : 'Mark as disbursed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DisbursementLog() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Which loan ID's B2C request is currently in flight (button-level spinner)
  const [b2cPendingId, setB2cPendingId] = useState(null);
  // Which loan is being manually disbursed via the modal
  const [manualTarget, setManualTarget] = useState(null);

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

  // Poll every 5s while any loan is 'disbursing'. The B2C callback takes
  // 5-30 seconds to resolve, and staff expect the row to update on its own
  // rather than needing a manual refresh. The effect clears its interval
  // the moment no disbursing loans remain, so the page doesn't poll
  // indefinitely.
  const hasDisbursing = loans.some((l) => l.status === 'disbursing');
  useEffect(() => {
    if (!hasDisbursing) return undefined;
    const id = setInterval(() => fetchLoans(false), 5000);
    return () => clearInterval(id);
  }, [hasDisbursing]);

  const handleDisburseB2C = async (loan) => {
    setB2cPendingId(loan.id);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/loans/auto-disburse/${loan.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      // Loan is now 'disbursing' — refetch so the row updates and the
      // polling effect kicks in
      await fetchLoans(false);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setB2cPendingId(null);
    }
  };

  const handleManualDisbursed = () => {
    setManualTarget(null);
    fetchLoans(false);
  };

  const filtered = loans.filter((l) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches = l.member_name?.toLowerCase().includes(q) || String(l.id).includes(q) || l.member_reference?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    // Date filters apply only to loans that have actually been disbursed.
    // Loans still awaiting disbursement have no disbursed_at to filter on,
    // and hiding them when a date range is set would make them impossible
    // to action from this page.
    if (dateFrom && l.disbursed_at && new Date(l.disbursed_at) < new Date(dateFrom)) return false;
    if (dateTo && l.disbursed_at && new Date(l.disbursed_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const handleReset = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  // Stats split by state so the operational picture is visible at a glance
  const awaiting = filtered.filter((l) => l.status === 'approved');
  const inFlight = filtered.filter((l) => l.status === 'disbursing');
  const completed = filtered.filter((l) => l.status === 'disbursed' || l.status === 'repaid');
  const totalDisbursed = completed.reduce((sum, l) => sum + Number(l.principal), 0);

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

  return (
    <AdminLayout title="Loan Disbursements" lede="Approve-to-disburse workflow — action approved loans, track in-flight B2C transfers, review completed disbursements.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="admin-stat-card" style={{ '--stat-accent': '#7a5a10' }}>
          <div className="admin-stat-card__value">{awaiting.length}</div>
          <div className="admin-stat-card__label">Awaiting Disbursement</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': '#2a4a7a' }}>
          <div className="admin-stat-card__value">{inFlight.length}</div>
          <div className="admin-stat-card__label">In Flight (B2C)</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
          <div className="admin-stat-card__value">{completed.length}</div>
          <div className="admin-stat-card__label">Disbursed Loans</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': '#55308a' }}>
          <div className="admin-stat-card__value">{formatKES(totalDisbursed)}</div>
          <div className="admin-stat-card__label">Total Disbursed</div>
        </div>
      </div>

      <div className="admin-table-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
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
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Disbursed From</div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>Disbursed To</div>
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
          No loans match that search.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Member</th>
                <th>Reference</th>
                <th style={{ textAlign: 'right' }}>Principal</th>
                <th>Term</th>
                <th style={{ textAlign: 'right' }}>Monthly</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>#{l.id}</td>
                  <td style={{ fontWeight: 500 }}>{l.member_name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>{l.member_reference}</td>
                  <td style={{ textAlign: 'right' }}>{formatKES(l.principal)}</td>
                  <td>{l.tenure_months} mo</td>
                  <td style={{ textAlign: 'right' }}>{formatKES(l.monthly_installment)}</td>
                  <td>{statusBadge(l.status)}</td>
                  <td>
                    {l.status === 'approved' && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleDisburseB2C(l)}
                          disabled={b2cPendingId === l.id}
                          className="admin-btn admin-btn--approve"
                          style={{ fontSize: '0.78rem', padding: '6px 12px', opacity: b2cPendingId === l.id ? 0.6 : 1 }}
                        >
                          {b2cPendingId === l.id ? 'Initiating…' : 'Disburse via M-Pesa'}
                        </button>
                        <button
                          onClick={() => setManualTarget(l)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-forest)', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                          or record manual
                        </button>
                      </div>
                    )}
                    {l.status === 'disbursing' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#2a4a7a' }}>
                        <span
                          className="spin"
                          style={{
                            display: 'inline-block',
                            width: 12,
                            height: 12,
                            border: '2px solid #dde7f5',
                            borderTopColor: '#2a4a7a',
                            borderRadius: '50%',
                            animation: 'spin 0.9s linear infinite',
                          }}
                        />
                        <span>Awaiting Safaricom confirmation…</span>
                      </div>
                    )}
                    {(l.status === 'disbursed' || l.status === 'repaid') && (
                      <span style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.4)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {manualTarget && (
        <ManualDisbursementModal
          loan={manualTarget}
          onClose={() => setManualTarget(null)}
          onDisbursed={handleManualDisbursed}
        />
      )}

      {/* Inline keyframes for the spinner. Placed here rather than in a
          global stylesheet because it's the only place in the portal that
          uses it; if that changes, move it to index.css. */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AdminLayout>
  );
}

export default DisbursementLog;