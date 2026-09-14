import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
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
const buttonDisabledStyle = { ...buttonStyle, background: '#c9c9c9', cursor: 'not-allowed' };

// 6 individual boxes, auto-advancing focus - matches the pattern from the
// Daraja OTP screen rather than one plain text field.
function OtpBoxes({ value, onChange }) {
  const refs = useRef([]);
  const digits = value.split('');

  const setDigit = (index, char) => {
    const next = value.split('');
    next[index] = char;
    const joined = next.join('').slice(0, 6);
    onChange(joined);
  };

  const handleChange = (index, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    setDigit(index, char || '');
    if (char && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      refs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: '1.3rem', fontWeight: 600,
            border: '1px solid var(--color-line)', borderRadius: 8, fontFamily: 'var(--font-body)',
          }}
        />
      ))}
    </div>
  );
}

function maskEmail(message) {
  // The backend already masks the email in `message` (e.g. "...sent to ra***e@gmail.com.")
  // - just style the masked address in green. Final segment restricted to
  // letters so it stops before the sentence-ending period, not after it.
  const match = message.match(/to ([^\s]+@[^\s]+\.[a-zA-Z]+)/);
  if (!match) return <>{message}</>;
  const [full, email] = match;
  const [before, after] = message.split(full);
  return <>{before}to <strong style={{ color: 'var(--color-forest)' }}>{email}</strong>{after}</>;
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [otpStep, setOtpStep] = useState(null);
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
        setOtpCode('');
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
      setOtpCode('');
    } catch (err) {
      setError(err.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow={otpStep ? undefined : 'Admin Console'}
      title={otpStep ? <>OTP <span style={{ color: 'var(--color-ink)' }}>Verification</span></> : 'KEMRI SACCO'}
      subtitle={otpStep ? undefined : 'Welcome back — staff & admin sign in'}
    >
      {otpStep && (
        <p style={{ fontSize: '0.9rem', color: 'rgba(31,36,33,0.7)', textAlign: 'center', marginBottom: 22 }}>
          {maskEmail(otpStep.message)}
        </p>
      )}

      {error && (
        <div style={{ background: '#f5d9d4', color: 'var(--color-error)', fontSize: '0.85rem', borderRadius: 6, padding: '10px 12px', marginBottom: 14 }}>
          {error}
        </div>
      )}

      {!otpStep ? (
        <form onSubmit={handleSubmit}>
          <input
            type="text" required placeholder="Username or Email" value={username}
            onChange={(e) => setUsername(e.target.value)} style={inputStyle}
          />
          <input
            type="password" required placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} style={inputStyle}
          />
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--color-forest)' }}>Forgot your password?</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(31,36,33,0.6)', marginBottom: 10 }}>
            Please Enter OTP
          </div>
          <OtpBoxes value={otpCode} onChange={setOtpCode} />
          <button type="submit" disabled={loading || otpCode.length < 6} style={loading || otpCode.length < 6 ? buttonDisabledStyle : buttonStyle}>
            {loading ? 'Verifying…' : 'Verify OTP'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem' }}>
            <span style={{ color: 'rgba(31,36,33,0.55)' }}>Have a problem with verification? </span>
            <button type="button" onClick={handleResend} disabled={resending} style={{ background: 'none', border: 'none', color: 'var(--color-forest)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
              {resending ? 'Sending…' : 'Resend OTP'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button type="button" onClick={() => setOtpStep(null)} style={{ background: 'none', border: 'none', color: 'rgba(31,36,33,0.4)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
              Back to login
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default Login;
