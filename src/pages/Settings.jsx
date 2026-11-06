import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';
import { ROLE_LABELS } from '../constants/roles';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid var(--color-line)',
  borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-body)',
};
const labelStyle = { fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 };

function SectionCard({ title, lede, children }) {
  return (
    <div className="admin-table-card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 4 }}>
        {title}
      </div>
      {lede && <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16 }}>{lede}</div>}
      {children}
    </div>
  );
}

function Settings() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({ full_name: '', phone: '', email: '', notify_sms: true, notify_email: false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);
  const [pwError, setPwError] = useState(null);

  // 2026-11-06: 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [saving2FA, setSaving2FA] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState(null);

  const getToken = () => localStorage.getItem('token');

  const fetchMe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load your account');
      const data = await res.json();
      const u = data.user || {};
      setProfile({
        full_name: u.full_name || '',
        phone: u.phone || '',
        email: u.email || '',
        notify_sms: u.notify_sms ?? true,
        notify_email: u.notify_email ?? false,
      });
      setTwoFactorEnabled(!!u.two_factor_enabled);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/me/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setProfileMessage('Saved.');
      if (setUser) setUser((prev) => ({ ...prev, full_name: updated.full_name }));
    } catch (err) {
      setProfileMessage(friendlyErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    setPwMessage(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPwMessage('Password updated.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(friendlyErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  // 2026-11-06: 2FA Handlers
  const handleEnable2FA = async () => {
    setSaving2FA(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to setup 2FA');
      setQrCode(data.qrCode);
      setTwoFactorSecret(data.secret);
    } catch (err) {
      setTwoFactorMsg(friendlyErrorMessage(err));
    } finally {
      setSaving2FA(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setSaving2FA(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ token: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');
      
      setTwoFactorEnabled(true);
      setQrCode(null);
      setTwoFactorSecret('');
      setTotpCode('');
      setTwoFactorMsg('Two-Factor Authentication is now enabled.');
    } catch (err) {
      setTwoFactorMsg(friendlyErrorMessage(err));
    } finally {
      setSaving2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA? This makes your account less secure.')) return;
    setSaving2FA(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');
      
      setTwoFactorEnabled(false);
      setTwoFactorMsg('Two-Factor Authentication has been disabled.');
    } catch (err) {
      setTwoFactorMsg(friendlyErrorMessage(err));
    } finally {
      setSaving2FA(false);
    }
  };

  return (
    <AdminLayout title="Settings" lede="Manage your profile, contact details, notifications, and password.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <SectionCard title="Profile" lede="Your name, username, and role in this console.">
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={labelStyle}>Full name</div>
                  <input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Username</div>
                  <input value={user?.username || ''} disabled style={{ ...inputStyle, background: '#f4f1ea', color: 'rgba(31,36,33,0.5)' }} />
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={labelStyle}>Role</div>
                <input
                  value={ROLE_LABELS[user?.role] || user?.role || ''}
                  disabled
                  style={{ ...inputStyle, width: 200, background: '#f4f1ea', color: 'rgba(31,36,33,0.5)' }}
                />
              </div>

              <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 18, marginBottom: 4 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 4 }}>
                  Contact & Notifications
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.5)', marginBottom: 14 }}>
                  How you're reached, and how you'd like to be notified of activity.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={labelStyle}>Phone</div>
                  <input
                    value={profile.phone} placeholder="0712345678"
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Email</div>
                  <input
                    value={profile.email} placeholder="you@kemrisacco.com"
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', marginBottom: 8 }}>
                <input type="checkbox" checked={profile.notify_sms} onChange={(e) => setProfile({ ...profile, notify_sms: e.target.checked })} />
                Notify me via SMS
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', marginBottom: 18 }}>
                <input type="checkbox" checked={profile.notify_email} onChange={(e) => setProfile({ ...profile, notify_email: e.target.checked })} />
                Notify me via Email
              </label>

              {profileMessage && (
                <div style={{ fontSize: '0.85rem', color: profileMessage === 'Saved.' ? 'var(--color-forest)' : 'var(--color-error)', marginBottom: 12 }}>
                  {profileMessage}
                </div>
              )}
              <button type="submit" disabled={savingProfile} className="admin-btn admin-btn--approve">
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Change Password" lede="Update the password you use to log in.">
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle}>Current password</div>
                <input
                  type="password" required value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={labelStyle}>New password</div>
                  <input
                    type="password" required minLength={8} value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Confirm new password</div>
                  <input
                    type="password" required value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              {pwError && <div className="error-banner" style={{ marginBottom: 12 }}>{pwError}</div>}
              {pwMessage && <div style={{ fontSize: '0.85rem', color: 'var(--color-forest)', marginBottom: 12 }}>{pwMessage}</div>}
              <button type="submit" disabled={savingPassword} className="admin-btn admin-btn--approve">
                {savingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </SectionCard>

          {/* 2026-11-06: 2FA Section */}
          <SectionCard title="Two-Factor Authentication (2FA)" lede="Add an extra layer of security to your account by requiring a 6-digit code from your Authenticator app.">
            {twoFactorMsg && (
              <div style={{ fontSize: '0.85rem', color: twoFactorMsg.includes('enabled') || twoFactorMsg.includes('disabled') ? 'var(--color-forest)' : 'var(--color-error)', marginBottom: 16, fontWeight: 500 }}>
                {twoFactorMsg}
              </div>
            )}

            {twoFactorEnabled ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Enabled</span>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(31,36,33,0.7)' }}>Your account is protected by 2FA.</span>
                </div>
                <button 
                  onClick={handleDisable2FA} 
                  disabled={saving2FA}
                  className="admin-btn admin-btn--reject"
                >
                  {saving2FA ? 'Disabling…' : 'Disable 2FA'}
                </button>
              </div>
            ) : qrCode ? (
              <div>
                <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 6, border: '1px solid var(--color-line)', display: 'inline-block', marginBottom: 16 }}>
                  <img src={qrCode} alt="2FA QR Code" style={{ display: 'block', width: 200, height: 200 }} />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(31,36,33,0.7)', marginBottom: 16, maxWidth: 400 }}>
                  Scan this QR code with Google Authenticator or Authy. If you can't scan it, enter this setup key manually: <br/>
                  <strong style={{ fontFamily: 'var(--font-mono)', background: '#eee', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>{twoFactorSecret}</strong>
                </div>
                <form onSubmit={handleVerify2FA} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div>
                    <div style={labelStyle}>Enter 6-digit code to verify</div>
                    <input
                      type="text" required maxLength={6} placeholder="000000"
                      value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      style={{ ...inputStyle, width: 150, fontFamily: 'var(--font-mono)', fontSize: '1.1rem', letterSpacing: 4 }}
                    />
                  </div>
                  <button type="submit" disabled={saving2FA || totpCode.length < 6} className="admin-btn admin-btn--approve" style={{ padding: '9px 16px' }}>
                    {saving2FA ? 'Verifying…' : 'Verify & Enable'}
                  </button>
                  <button type="button" onClick={() => setQrCode(null)} className="admin-btn" style={{ background: '#eee', color: '#333' }}>
                    Cancel
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(31,36,33,0.7)', marginBottom: 16 }}>
                  2FA is currently <strong>disabled</strong>. We highly recommend enabling it to prevent unauthorized access.
                </div>
                <button 
                  onClick={handleEnable2FA} 
                  disabled={saving2FA}
                  className="admin-btn admin-btn--approve"
                >
                  {saving2FA ? 'Loading QR Code…' : 'Enable 2FA'}
                </button>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </AdminLayout>
  );
}

export default Settings;