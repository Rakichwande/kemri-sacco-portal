import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">KEMRI SACCO</h1>
          <p className="text-gray-500 text-sm mt-1">Reset your password</p>
        </div>

        {message ? (
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-4">{message}</p>
            <Link to="/login" className="text-blue-700 underline text-sm">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
              <input
                type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="w-full bg-blue-700 text-white rounded py-2 text-sm font-medium hover:bg-blue-800"
            >
              {submitting ? 'Sending…' : 'Send Reset Link'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-gray-500 underline">Back to login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
