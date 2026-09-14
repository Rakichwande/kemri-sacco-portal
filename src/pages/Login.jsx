import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // OTP step state
  const [otpStep, setOtpStep] = useState(null); // { otpToken, message } | null
  const [otpCode, setOtpCode] = useState('');
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result && result.otpRequired) {
        setOtpStep({ otpToken: result.otpToken, message: result.message });
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(otpStep.otpToken, otpCode);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpToken: otpStep.otpToken }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (err) {
      setError(err.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">KEMRI SACCO</h1>
          <p className="text-gray-500 text-sm mt-1">{otpStep ? 'Enter Verification Code' : 'Admin Login'}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded p-3 mb-4">{error}</div>
        )}

        {!otpStep ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username or Email</label>
              <input
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-700 text-white rounded py-2 text-sm font-medium hover:bg-blue-800"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-blue-700 underline">Forgot password?</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">{otpStep.message}</p>
            <input
              type="text" required inputMode="numeric" maxLength={6} placeholder="6-digit code"
              value={otpCode} onChange={(e) => setOtpCode(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm text-center tracking-widest text-lg"
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-700 text-white rounded py-2 text-sm font-medium hover:bg-blue-800"
            >
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => setOtpStep(null)} className="text-gray-500 underline">
                Back
              </button>
              <button type="button" onClick={handleResend} disabled={resending} className="text-blue-700 underline">
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
