import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function StaffManagement() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'staff' });
  const [submitting, setSubmitting] = useState(false);

  const getToken = () => localStorage.getItem('token');

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStaff(await res.json());
    } catch (err) {
      console.error('Fetch staff error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create account');
      }
      setShowInvite(false);
      setForm({ username: '', password: '', full_name: '', role: 'staff' });
      fetchStaff();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }
      fetchStaff();
    } catch (err) {
      alert('Error: ' + err.message);
      fetchStaff(); // revert the dropdown to the real value
    }
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove ${name}'s access to this console?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove account');
      }
      fetchStaff();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <AdminLayout title="Staff & Admin Management" lede="Manage who can access this admin console and their permissions.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{
        background: 'var(--color-sage)', border: '1px solid var(--color-line)', borderRadius: 4,
        padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', color: 'var(--color-forest-deep)',
      }}>
        Admins have full access. Staff accounts are view-only and cannot approve loans or manage accounts.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="admin-btn admin-btn--approve" onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? 'Cancel' : '+ Invite Staff'}
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="admin-table-card" style={{ padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <input required placeholder="Full name" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4 }} />
          <input required placeholder="Username" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4 }} />
          <input required type="password" placeholder="Temporary password (min 8 chars)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4 }} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4 }}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={submitting} className="admin-btn admin-btn--approve" style={{ gridColumn: 'span 2' }}>
            {submitting ? 'Creating…' : 'Create Account'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(31,36,33,0.5)' }}>Loading…</div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>
                    {s.full_name} {s.id === currentUser?.id && <span style={{ color: 'rgba(31,36,33,0.45)', fontWeight: 400 }}>(you)</span>}
                  </td>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>{s.username}</td>
                  <td>
                    <select
                      value={s.role}
                      onChange={(e) => handleRoleChange(s.id, e.target.value)}
                      disabled={s.id === currentUser?.id}
                      style={{ padding: '5px 8px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.85rem' }}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    {s.id !== currentUser?.id && (
                      <button className="admin-btn admin-btn--reject" onClick={() => handleRemove(s.id, s.full_name)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

export default StaffManagement;
