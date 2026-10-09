import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

const TYPE_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  disbursement: 'Loan Disbursement',
  repayment: 'Loan Repayment',
};

function StatementModal({ memberId, onClose }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatement = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/members/${memberId}/statement`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load statement');
        }
        setStatement(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStatement();
  }, [memberId]);

  const handlePrint = () => window.print();

  // Repayment split summary — rendered only when the member has at least
  // one repayment on record. Backend provides statement.repaymentSummary
  // with principalPaid + interestPaid + count. Guard against missing field
  // so older responses don't crash the modal.
  const hasRepaymentHistory =
    statement?.repaymentSummary &&
    Number(statement.repaymentSummary.total) > 0;

  return (
    <div
      onClick={onClose}
      className="statement-modal-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="statement-modal-content"
        style={{ background: '#fff', borderRadius: 6, width: 640, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto', padding: 28 }}
      >
        {loading && <div style={{ textAlign: 'center', padding: 24, color: 'rgba(31,36,33,0.5)' }}>Loading statement…</div>}

        {error && (
          <>
            <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>
            <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              Close
            </button>
          </>
        )}

        {statement && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px solid var(--color-line)', paddingBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
                KEMRI SACCO
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.5)' }}>Member Statement</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: '0.88rem' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{statement.member.full_name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'rgba(31,36,33,0.55)' }}>{statement.member.reference}</div>
                <div style={{ color: 'rgba(31,36,33,0.55)' }}>{statement.member.phone_number}</div>
              </div>
            </div>

            {/* Financial snapshot — three numbers side by side so the
                member's full position is visible at a glance.

                  Savings         = closingBalance (computed at bottom)
                  Outstanding     = member.total_outstanding_balance
                  Net position    = savings − outstanding
            */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: hasRepaymentHistory ? 8 : 20,
              padding: 16,
              background: 'var(--color-sage-soft, #eef2ee)',
              borderRadius: 4,
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>
                  Savings Balance
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
                  {formatKES(statement.closingBalance)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>
                  Loan Outstanding
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: statement.member.total_outstanding_balance > 0 ? '#a13030' : 'rgba(31,36,33,0.5)',
                }}>
                  {statement.member.total_outstanding_balance > 0
                    ? formatKES(statement.member.total_outstanding_balance)
                    : 'KES 0'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>
                  Net Position
                </div>
                {(() => {
                  const net = Number(statement.closingBalance) - Number(statement.member.total_outstanding_balance);
                  return (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: net >= 0 ? 'var(--color-forest-deep)' : '#a13030',
                    }}>
                      {net < 0 ? '-' : ''}{formatKES(Math.abs(net))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Repayment split summary — added 2026-10-09 (Phase 4).
                Shows how much of the member's repayments went to principal
                vs interest. Sits below the main snapshot as a narrower,
                single-row band so the top three cards stay visually
                dominant. Only rendered when the member has at least one
                repayment on record — pure savers see nothing extra. */}
            {hasRepaymentHistory && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 20,
                padding: '10px 16px',
                background: '#f7f9f7',
                border: '1px solid var(--color-line)',
                borderRadius: 4,
                fontSize: '0.82rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.45)', marginBottom: 2 }}>
                    Principal Repaid
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatKES(statement.repaymentSummary.principalPaid)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.45)', marginBottom: 2 }}>
                    Interest Paid
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1f5e3a' }}>
                    {formatKES(statement.repaymentSummary.interestPaid)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.45)', marginBottom: 2 }}>
                    Total Repaid
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatKES(statement.repaymentSummary.total)}
                  </div>
                </div>
              </div>
            )}

            {/* Active loan detail, shown only when a loan is in flight.
                The "Paid So Far" figure is now split so the member sees
                exactly how much of their payments went to interest (a
                real cost) vs principal (their own debt reducing). */}
            {statement.activeLoan && (
              <div style={{
                marginBottom: 20,
                padding: 14,
                border: '1px solid var(--color-line)',
                borderRadius: 4,
                fontSize: '0.85rem',
              }}>
                <div style={{
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  color: 'rgba(31,36,33,0.5)',
                  marginBottom: 8,
                  letterSpacing: '0.04em',
                }}>
                  Active Loan · {statement.activeLoan.reference}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(31,36,33,0.5)' }}>Principal</div>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>{formatKES(statement.activeLoan.principal)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(31,36,33,0.5)' }}>Repaid So Far</div>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>{formatKES(statement.activeLoan.amount_paid)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(31,36,33,0.5)' }}>Monthly</div>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>{formatKES(statement.activeLoan.monthly_installment)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(31,36,33,0.5)' }}>Term</div>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>{statement.activeLoan.tenure_months} mo</div>
                  </div>
                </div>
                {/* Split of the amount paid so far, when backend supplies it. */}
                {statement.activeLoan.principal_paid !== undefined && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 10,
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: '1px dashed var(--color-line)',
                    fontSize: '0.78rem',
                  }}>
                    <div>
                      <span style={{ color: 'rgba(31,36,33,0.5)' }}>Principal paid:</span>{' '}
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatKES(statement.activeLoan.principal_paid)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(31,36,33,0.5)' }}>Interest paid:</span>{' '}
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#1f5e3a' }}>
                        {formatKES(statement.activeLoan.interest_paid)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {statement.lines.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'rgba(31,36,33,0.5)', fontSize: '0.88rem' }}>
                No transactions on record for this member yet.
              </div>
            ) : (
              <table className="admin-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Savings Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.lines.map((line, i) => {
                    // Repayment lines carry a principal/interest split from
                    // the Phase 2 schema. Render it as a small sub-line in
                    // the Amount cell so the table stays narrow. Deposits
                    // and disbursements render the amount alone, as before.
                    const isRepayment =
                      line.type === 'repayment' &&
                      line.principal_paid !== undefined &&
                      line.interest_paid !== undefined;

                    return (
                      <tr key={i}>
                        <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                          {new Date(line.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>{TYPE_LABELS[line.type] || line.type}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'rgba(31,36,33,0.6)' }}>{line.reference || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div>{formatKES(line.amount)}</div>
                          {isRepayment && (
                            <div style={{
                              fontSize: '0.68rem',
                              color: 'rgba(31,36,33,0.5)',
                              marginTop: 2,
                              fontFamily: 'var(--font-mono)',
                            }}>
                              P&nbsp;{formatKES(line.principal_paid)} · I&nbsp;{formatKES(line.interest_paid)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{line.balance !== null ? formatKES(line.balance) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="statement-modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={onClose} style={{ padding: '9px 18px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                Close
              </button>
              <button onClick={handlePrint} className="admin-btn admin-btn--approve">
                Print
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StatementModal;