import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1px solid var(--color-line)',
  borderRadius: 8, fontSize: '0.92rem', fontFamily: 'var(--font-body)', marginBottom: 14,
};
const buttonStyle = {
  width: '100%', padding: '11px', background: 'var(--color-forest)', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer',
};

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/reset-password/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
        setValidToken(true);
      })
      .catch((err) => setTokenError(friendlyErrorMessage(err)))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setSubmitError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout eyebrow="Admin Console" title="Reset Password" subtitle="Set a new password for your account">
      {checking ? (
        <LoadingState label="Checking link…" />
      ) : tokenError ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginBottom: 16 }}>{tokenError}</p>
          <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--color-forest)' }}>Request a new link</Link>
        </div>
      ) : success ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-forest)', fontWeight: 600, marginBottom: 6 }}>Password updated!</p>
          <p style={{ color: 'rgba(31,36,33,0.55)', fontSize: '0.85rem' }}>Redirecting to login…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {submitError && (
            <div style={{ background: '#f5d9d4', color: 'var(--color-error)', fontSize: '0.85rem', borderRadius: 6, padding: '10px 12px', marginBottom: 14 }}>
              {submitError}
            </div>
          )}
          <input
            required type="password" placeholder="New password (min 8 characters)" value={password}
            onChange={(e) => setPassword(e.target.value)} style={inputStyle}
          />
          <input
            required type="password" placeholder="Confirm new password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle}
          />
          <button type="submit" disabled={submitting} style={buttonStyle}>
            {submitting ? 'Saving…' : 'Set New Password'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

export default ResetPassword;
