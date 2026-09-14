import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
      .catch((err) => setTokenError(err.message))
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
          <p className="text-gray-500 text-sm mt-1">Set a new password</p>
        </div>

        {checking ? (
          <p className="text-center text-gray-500 text-sm">Checking link…</p>
        ) : tokenError ? (
          <div className="text-center">
            <p className="text-red-600 text-sm mb-4">{tokenError}</p>
            <Link to="/forgot-password" className="text-blue-700 underline text-sm">Request a new link</Link>
          </div>
        ) : success ? (
          <div className="text-center">
            <p className="text-green-700 font-medium mb-2">Password updated!</p>
            <p className="text-gray-500 text-sm">Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && <div className="bg-red-50 text-red-600 text-sm rounded p-3">{submitError}</div>}
            <input
              required type="password" placeholder="New password (min 8 characters)" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <input
              required type="password" placeholder="Confirm new password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <button
              type="submit" disabled={submitting}
              className="w-full bg-blue-700 text-white rounded py-2 text-sm font-medium hover:bg-blue-800"
            >
              {submitting ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
