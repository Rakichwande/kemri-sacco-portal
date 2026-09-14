import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1px solid var(--color-line)',
  borderRadius: 8, fontSize: '0.92rem', fontFamily: 'var(--font-body)', marginBottom: 14,
};
const buttonStyle = {
  width: '100%', padding: '11px', background: 'var(--color-forest)', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer',
};

function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      setMessage(data.message);
    } catch (err) {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout eyebrow="Admin Console" title="Forgot Password" subtitle="We'll send you a link to reset it">
      {message ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: 'rgba(31,36,33,0.7)', marginBottom: 20 }}>{message}</p>
          <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--color-forest)' }}>Back to login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="text" required placeholder="Username or Email" value={identifier}
            onChange={(e) => setIdentifier(e.target.value)} style={inputStyle}
          />
          <button type="submit" disabled={submitting} style={buttonStyle}>
            {submitting ? 'Sending…' : 'Reset Password'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link to="/login" style={{ fontSize: '0.85rem', color: 'rgba(31,36,33,0.55)' }}>← Back to Login</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;
