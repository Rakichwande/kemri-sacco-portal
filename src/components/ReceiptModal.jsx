import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// paymentId looks up by payments.id directly (Contribution Logs).
// mpesaReceipt looks up by mpesa_receipt instead (Repayment History,
// whose rows are keyed to repayments.id - a different table/sequence -
// with no direct link back to the payments row). Pass exactly one.
function ReceiptModal({ paymentId, mpesaReceipt, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const url = paymentId
          ? `${API_BASE}/api/payments/${paymentId}/receipt`
          : `${API_BASE}/api/payments/receipt-by-receipt/${encodeURIComponent(mpesaReceipt)}`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load receipt');
        }
        setReceipt(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [paymentId, mpesaReceipt]);

  const handlePrint = () => window.print();

  return (
    <div
      onClick={onClose}
      className="receipt-modal-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="receipt-modal-content"
        style={{ background: '#fff', borderRadius: 6, width: 420, maxWidth: '90vw', padding: 28 }}
      >
        {loading && <div style={{ textAlign: 'center', padding: 24, color: 'rgba(31,36,33,0.5)' }}>Loading receipt…</div>}

        {error && (
          <>
            <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>
            <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              Close
            </button>
          </>
        )}

        {receipt && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px solid var(--color-line)', paddingBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
                KEMRI SACCO
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.5)' }}>Payment Receipt</div>
            </div>

            <ReceiptRow label="Member" value={receipt.member_name} />
            <ReceiptRow label="Member Ref" value={receipt.member_reference} mono />
            <ReceiptRow label="Type" value={receipt.loan_id ? 'Loan Repayment' : 'Deposit'} />
            <ReceiptRow label="Amount" value={formatKES(receipt.amount)} bold />
            <ReceiptRow label="M-Pesa Receipt" value={receipt.mpesa_receipt || '—'} mono />
            <ReceiptRow
              label="Date"
              value={new Date(receipt.created_at).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            />
            <ReceiptRow label="Status" value={receipt.status} />

            <div className="receipt-modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
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

function ReceiptRow({ label, value, mono, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(31,36,33,0.06)', fontSize: '0.88rem' }}>
      <span style={{ color: 'rgba(31,36,33,0.55)' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}

export default ReceiptModal;