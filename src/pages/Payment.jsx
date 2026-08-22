import { useState, useRef, useEffect } from 'react';
import { initiatePayment, checkPaymentStatus } from '../api';

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 90000;

export default function Payment({ member }) {
  const [phase, setPhase] = useState('ready');
  const [amount, setAmount] = useState(member.monthly_contribution || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [receipt, setReceipt] = useState(null);
  const pollTimer = useRef(null);
  const pollDeadline = useRef(null);

  useEffect(() => () => clearInterval(pollTimer.current), []);

  function startPolling(checkoutRequestId) {
    pollDeadline.current = Date.now() + POLL_TIMEOUT_MS;

    pollTimer.current = setInterval(async () => {
      if (Date.now() > pollDeadline.current) {
        clearInterval(pollTimer.current);
        setPhase('error');
        setErrorMsg('This is taking longer than expected. Check your phone — if you already approved the prompt, your payment may still be processing.');
        return;
      }

      try {
        const { status, mpesaReceipt } = await checkPaymentStatus(checkoutRequestId);
        if (status === 'completed') {
          clearInterval(pollTimer.current);
          setReceipt(mpesaReceipt);
          setPhase('success');
        } else if (status === 'failed') {
          clearInterval(pollTimer.current);
          setPhase('failed');
        }
      } catch (err) {
        console.error('Status check failed:', err.message);
      }
    }, POLL_INTERVAL_MS);
  }

  async function handlePay() {
    setErrorMsg('');
    setPhase('prompting');

    try {
      const { checkoutRequestId } = await initiatePayment({
        memberId: member.id,
        phoneNumber: member.phone_number,
        amount: Number(amount),
      });
      setPhase('waiting');
      startPolling(checkoutRequestId);
    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message);
    }
  }

  if (phase === 'success') {
    return (
      <div className="card">
        <div className="success-panel">
          <div className="success-panel__mark">✓</div>
          <h2 className="page-title" style={{ fontSize: '1.6rem', marginBottom: 4 }}>
            Payment received
          </h2>
          <p style={{ color: 'rgba(31,36,33,0.7)' }}>
            Thank you, {member.full_name.split(' ')[0]}. A confirmation SMS is on its way.
          </p>
          {receipt && <p className="success-panel__ref">M-Pesa ref: {receipt}</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="page-eyebrow">Step 2 of 2</p>
      <h1 className="page-title">Make your first contribution</h1>
      <p className="page-lede">
        We'll send a payment prompt to {member.phone_number}. Enter your PIN on your phone to
        complete it.
      </p>

      <div className="card">
        {phase === 'error' && (
          <div className="error-banner" role="alert">
            {errorMsg}
          </div>
        )}

        {phase === 'failed' && (
          <div className="error-banner" role="alert">
            The payment wasn't completed — it may have been cancelled or timed out on your phone.
            You can try again below.
          </div>
        )}

        {(phase === 'ready' || phase === 'error' || phase === 'failed') && (
          <>
            <div className="field">
              <label htmlFor="amount">Amount (KES)</label>
              <input
                id="amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button className="btn-primary" onClick={handlePay} disabled={!amount || Number(amount) <= 0}>
              Send M-Pesa prompt
            </button>
          </>
        )}

        {phase === 'prompting' && <p>Sending payment prompt…</p>}

        {phase === 'waiting' && (
          <div>
            <p style={{ fontWeight: 500 }}>Check your phone</p>
            <p className="hint">Enter your M-Pesa PIN to complete the payment of KES {amount}.</p>
          </div>
        )}
      </div>
    </>
  );
}