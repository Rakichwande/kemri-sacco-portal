import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">KEMRI SACCO</h1>
          <p className="text-gray-500 text-sm mt-1">Accept Staff Invitation</p>
        </div>

        {loadingInvite ? (
          <p className="text-center text-gray-500">Checking invite…</p>
        ) : inviteError ? (
          <div className="text-center">
            <p className="text-red-600 mb-4">{inviteError}</p>
            <Link to="/login" className="text-green-700 underline text-sm">Go to login</Link>
          </div>
        ) : success ? (
          <div className="text-center">
            <p className="text-green-700 font-medium mb-2">Account created!</p>
            <p className="text-gray-500 text-sm">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4 text-center">
              You've been invited as <strong>{invite.role}</strong> for <strong>{invite.email}</strong>.
            </p>
            {submitError && (
              <div className="bg-red-50 text-red-600 text-sm rounded p-3 mb-4">{submitError}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required placeholder="Full name" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                required placeholder="Choose a username" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                placeholder="Phone (optional, for SMS notifications)" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                required type="password" placeholder="Password (min 8 characters)" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                required type="password" placeholder="Confirm password" value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <div className="text-xs text-gray-500 pt-1">How should we notify you of activity (new members, loan applications, repayments, deposits)?</div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.notify_sms} onChange={(e) => setForm({ ...form, notify_sms: e.target.checked })} />
                SMS (requires the phone number above)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.notify_email} onChange={(e) => setForm({ ...form, notify_email: e.target.checked })} />
                Email ({invite.email})
              </label>
              <button
                type="submit" disabled={submitting}
                className="w-full bg-green-800 text-white rounded py-2 text-sm font-medium hover:bg-green-900"
              >
                {submitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default AcceptInvite;
