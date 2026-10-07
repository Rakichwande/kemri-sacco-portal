import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// A loan is considered "stuck" if it's been in disbursing state longer
// than this. Safaricom's B2C callbacks normally arrive in 5-30 seconds;
// if nothing has come after 5 minutes, something has gone wrong and the
// staff needs a manual override path.
const STUCK_DISBURSEMENT_THRESHOLD_MS = 5 * 60 * 1000;

const LIFECYCLE_STATUSES = ['approved', 'disbursing', 'disbursed', 'repaid'];

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

// Stuck disbursement resolution modal. Shows when staff click "Resolve" on
// a loan that's been in disbursing state for too long. Staff must have
// already checked M-Pesa and know whether the member received the funds.
function ResolveStuckModal({ loan, onClose, onResolved }) {
  const [outcome, setOutcome] = useState('');
  const [receipt, setReceipt] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Compute how long it's been stuck, for the header
  const disbursingAt = loan.disbursing_at ? new Date(loan.disbursing_at) : null;
  const minutesStuck = disbursingAt
    ? Math.round((Date.now() - disbursingAt.getTime()) / 60000)
    : null;

  const canSubmit =
    outcome === 'received' ? receipt.trim().length > 0 :
    outcome === 'not_received' ? true :
    false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/loans/${loan.id}/resolve-disbursement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ outcome, receipt: receipt.trim() || null, reason: reason.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onResolved(data);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 6, width: 500, maxWidth: '92vw', padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: '#7a5a10', marginBottom: 4 }}>
          Resolve stuck disbursement
        </div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
          {loan.reference || `LN-${String(loan.id).padStart(5, '0')}`} · {formatKES(loan.principal)} to {loan.member_name}
          {minutesStuck !== null && ` · in disbursing for ${minutesStuck} minute${minutesStuck === 1 ? '' : 's'}`}
        </div>

        <div style={{ padding: 12, background: '#fbf3e6', border: '1px solid #e8d4a8', borderRadius: 4, fontSize: '0.82rem', color: '#7a5a10', marginBottom: 16, lineHeight: 1.5 }}>
          Safaricom accepted this payout but never sent a result callback. <strong>Verify the outcome on M-Pesa before choosing.</strong> You can check the SACCO's B2C statement, or ask the member to confirm whether they received the funds.
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Option 1 — received */}
          <label style={{
            display: 'block',
            padding: 12,
            border: `1px solid ${outcome === 'received' ? 'var(--color-forest)' : 'var(--color-line)'}`,
            borderRadius: 4,
            marginBottom: 10,
            cursor: 'pointer',
            background: outcome === 'received' ? 'var(--color-sage-soft, #eef2ee)' : '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: outcome === 'received' ? 10 : 0 }}>
              <input
                type="radio"
                name="outcome"
                value="received"
                checked={outcome === 'received'}
                onChange={(e) => setOutcome(e.target.value)}
              />
              <strong style={{ fontSize: '0.88rem' }}>The member received the funds</strong>
            </div>
            {outcome === 'received' && (
              <>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>
                  M-Pesa receipt *
                </div>
                <input
                  type="text"
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  placeholder="e.g. SJK4X7Y2N1"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}
                />
                <div style={{ fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginTop: 6, lineHeight: 1.4 }}>
                  The loan will be marked disbursed, the member's outstanding balance incremented, and a confirmation SMS sent.
                </div>
              </>
            )}
          </label>

          {/* Option 2 — not received */}
          <label style={{
            display: 'block',
            padding: 12,
            border: `1px solid ${outcome === 'not_received' ? 'var(--color-forest)' : 'var(--color-line)'}`,
            borderRadius: 4,
            marginBottom: 16,
            cursor: 'pointer',
            background: outcome === 'not_received' ? 'var(--color-sage-soft, #eef2ee)' : '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: outcome === 'not_received' ? 10 : 0 }}>
              <input
                type="radio"
                name="outcome"
                value="not_received"
                checked={outcome === 'not_received'}
                onChange={(e) => setOutcome(e.target.value)}
              />
              <strong style={{ fontSize: '0.88rem' }}>The member did NOT receive the funds</strong>
            </div>
            {outcome === 'not_received' && (
              <>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>
                  Reason (optional)
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. insufficient balance on Safaricom, or confirmed on statement"
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem' }}
                />
                <div style={{ fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)', marginTop: 6, lineHeight: 1.4 }}>
                  The loan will be rolled back to Approved. No balance change. Ready to retry from the portal.
                </div>
              </>
            )}
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="admin-btn admin-btn--approve"
              style={{ flex: 1, opacity: canSubmit && !submitting ? 1 : 0.5 }}
            >
              {submitting ? 'Resolving…' : 'Confirm resolution'}
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
  const [b2cPendingId, setB2cPendingId] = useState(null);
  const [manualTarget, setManualTarget] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);

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

  // Poll every 5s while any loan is 'disbursing'. This lets the row update
  // automatically when the B2C callback arrives.
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

  const handleResolved = () => {
    setResolveTarget(null);
    fetchLoans(false);
  };

  const filtered = loans.filter((l) => {
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

  // Is this disbursing loan stuck? Compares disbursing_at against the
  // threshold. Returns false if disbursing_at is missing (older loans
  // that pre-date the column) — better to hide the Resolve link than
  // show it based on unknown data.
  const isStuck = (loan) => {
    if (loan.status !== 'disbursing') return false;
    if (!loan.disbursing_at) return false;
    return (Date.now() - new Date(loan.disbursing_at).getTime()) > STUCK_DISBURSEMENT_THRESHOLD_MS;
  };

  return (
    <AdminLayout title="Loan Disbursements" lede="Approve-to-disburse workflow — action approved loans, track in-flight B2C transfers, review completed disbursements.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
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
        <div className="admin-stat-card" style={{ '--stat-accent': '#a13030' }}>
          <div className="admin-stat-card__value">{formatKES(totalOutstanding)}</div>
          <div className="admin-stat-card__label">Total Outstanding</div>
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
                <th style={{ textAlign: 'right' }}>Remaining</th>
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
                  <td>{l.tenure_months} {l.tenure_months === 1 ? 'mo' : 'mo'}</td>
                  <td style={{ textAlign: 'right' }}>{formatKES(l.monthly_installment)}</td>
                  <td style={{ textAlign: 'right' }}>{remainingCell(l)}</td>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                        {isStuck(l) && (
                          <button
                            onClick={() => setResolveTarget(l)}
                            style={{ background: 'none', border: 'none', color: '#a13030', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline', textAlign: 'left' }}
                          >
                            Stuck? Resolve manually →
                          </button>
                        )}
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

      {resolveTarget && (
        <ResolveStuckModal
          loan={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolved={handleResolved}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AdminLayout>
  );
}

export default DisbursementLog;