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
                member's full position is visible at a glance. Before this,
                the statement showed only savings; the loan position was
                invisible to anyone reading it.

                  Savings         = closingBalance (computed at bottom)
                  Outstanding     = member.total_outstanding_balance
                  Net position    = savings − outstanding

                Net position is informational — a member with KES 5,000
                savings and KES 8,000 outstanding has −KES 3,000 net, which
                is what an accountant would call their actual equity in the
                SACCO. Signed so positive/negative reads correctly. */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 20,
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

            {/* Active loan detail, shown only when a loan is in flight.
                Gives staff the specifics without them having to open the
                Disbursement Log in a separate tab — term, monthly, paid so
                far. Disappears entirely for members with no active loan,
                so the modal stays uncluttered for savers. */}
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
                    <div style={{ fontSize: '0.7rem', color: 'rgba(31,36,33,0.5)' }}>Paid So Far</div>
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
                  {statement.lines.map((line, i) => (
                    <tr key={i}>
                      <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                        {new Date(line.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>{TYPE_LABELS[line.type] || line.type}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'rgba(31,36,33,0.6)' }}>{line.reference || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{formatKES(line.amount)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>{line.balance !== null ? formatKES(line.balance) : '—'}</td>
                    </tr>
                  ))}
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