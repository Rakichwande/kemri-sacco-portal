import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1px solid var(--color-line)',
  borderRadius: 8, fontSize: '0.92rem', fontFamily: 'var(--font-body)', marginBottom: 12,
};
const buttonStyle = {
  width: '100%', padding: '11px', background: 'var(--color-forest)', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer',
};

function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState(null);

  const [form, setForm] = useState({ full_name: '', username: '', phone: '', password: '', confirmPassword: '', notify_sms: true, notify_email: true });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/invites/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Invite not found');
        }
        return res.json();
      })
      .then(setInvite)
      .catch((err) => setInviteError(err.message))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (form.password !== form.confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          username: form.username,
          phone: form.phone || undefined,
          password: form.password,
          notify_sms: form.notify_sms,
          notify_email: form.notify_email,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to accept invite');
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout eyebrow="Staff Invitation" title="KEMRI SACCO" subtitle="Complete your account setup">
      {loadingInvite ? (
        <p style={{ textAlign: 'center', color: 'rgba(31,36,33,0.5)', fontSize: '0.9rem' }}>Checking invite…</p>
      ) : inviteError ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginBottom: 16 }}>{inviteError}</p>
          <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--color-forest)' }}>Go to login</Link>
        </div>
      ) : success ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-forest)', fontWeight: 600, marginBottom: 6 }}>Account created!</p>
          <p style={{ color: 'rgba(31,36,33,0.55)', fontSize: '0.85rem' }}>Redirecting you to login…</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'rgba(31,36,33,0.6)', textAlign: 'center', marginBottom: 18 }}>
            You've been invited as <strong>{invite.role}</strong> for <strong>{invite.email}</strong>.
          </p>
          {submitError && (
            <div style={{ background: '#f5d9d4', color: 'var(--color-error)', fontSize: '0.85rem', borderRadius: 6, padding: '10px 12px', marginBottom: 14 }}>
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <input
              required placeholder="Full name" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={inputStyle}
            />
            <input
              required placeholder="Choose a username" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} style={inputStyle}
            />
            <input
              placeholder="Phone (optional, for SMS notifications)" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle}
            />
            <input
              required type="password" placeholder="Password (min 8 characters)" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle}
            />
            <input
              required type="password" placeholder="Confirm password" value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} style={inputStyle}
            />
            <div style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.5)', margin: '4px 0 8px' }}>
              How should we notify you of activity?
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', marginBottom: 6 }}>
              <input type="checkbox" checked={form.notify_sms} onChange={(e) => setForm({ ...form, notify_sms: e.target.checked })} />
              SMS (requires the phone number above)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', marginBottom: 18 }}>
              <input type="checkbox" checked={form.notify_email} onChange={(e) => setForm({ ...form, notify_email: e.target.checked })} />
              Email ({invite.email})
            </label>
            <button type="submit" disabled={submitting} style={buttonStyle}>
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

export default AcceptInvite;
