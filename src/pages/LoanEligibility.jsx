import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// --- MODAL COMPONENT ---
function EditLimitModal({ member, onClose, onSaved }) {
  const [creditLimit, setCreditLimit] = useState(member?.credit_limit || 0);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!member) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return setError('Reason for change is required.');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/members/${member.id}/credit-limit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ creditLimit: Number(creditLimit), reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update limit');
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 6, width: 440, padding: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: '1.2rem', color: 'var(--color-forest-deep)' }}>Edit Limit: {member.full_name}</h3>
        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: 4, marginBottom: 12, fontSize: '0.85rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>New Credit Limit (KES)</label>
            <input type="number" required value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason for Change</label>
            <textarea required value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} rows="2" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: '8px 16px', border: 'none', borderRadius: 4, background: 'var(--color-forest)', color: '#fff', cursor: 'pointer' }}>{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function LoanEligibility() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [limitTarget, setLimitTarget] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      
      const data = await res.json();
      
      // Safety check: Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setMembers(data);
      } else {
        setMembers([]);
        setError('Invalid data format received from server.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch members.');
      setMembers([]); // Ensure it stays an array even on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  // Ensure we always map over an array, even if 'members' was somehow corrupted
  const safeMembers = Array.isArray(members) ? members : [];
  
  const filteredMembers = safeMembers.filter(m => {
    const limit = Number(m.credit_limit || 0);
    if (activeTab === 'All') return true;
    if (activeTab === 'Board/Staff') return m.is_board_staff;
    if (activeTab === '5K') return limit === 5000 && !m.is_board_staff;
    if (activeTab === 'No Loan') return limit === 0;
    if (activeTab === 'Custom') return limit !== 0 && limit !== 5000 && limit !== 10000;
    return true;
  });

  const TabButton = ({ label }) => (
    <button
      onClick={() => setActiveTab(label)}
      style={{
        padding: '8px 16px', border: '1px solid var(--color-line)', borderRadius: 4,
        background: activeTab === label ? 'var(--color-forest)' : '#fff',
        color: activeTab === label ? '#fff' : 'var(--color-ink)',
        cursor: 'pointer', fontWeight: 500
      }}
    >
      {label}
    </button>
  );

  return (
    <AdminLayout title="Loan Eligibility Directory" lede="View and manage credit limits across all member categories.">
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 6, marginBottom: 20 }}>{error}</div>}
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <TabButton label="All" />
        <TabButton label="Board/Staff" />
        <TabButton label="5K" />
        <TabButton label="Custom" />
        <TabButton label="No Loan" />
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>Loading members...</div>
      ) : (
        <div className="admin-table-card">
          {filteredMembers.length === 0 ? (
             <div style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
               No members found in this category.
             </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Reference</th>
                  <th>Current Limit</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m => {
                  const limit = Number(m.credit_limit || 0);
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>
                        {m.full_name}
                        {m.is_board_staff && <span style={{ marginLeft: 8, fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4 }}>BOARD/STAFF</span>}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{m.reference || '—'}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px', borderRadius: 4, fontWeight: 600,
                          background: limit === 0 ? '#fee2e2' : limit === 5000 ? '#e0f2fe' : '#dcfce7',
                          color: limit === 0 ? '#b91c1c' : limit === 5000 ? '#0369a1' : '#15803d'
                        }}>
                          KES {limit.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ color: Number(m.total_outstanding_balance) > 0 ? '#a13030' : 'inherit' }}>
                        {Number(m.total_outstanding_balance) > 0 ? `KES ${Number(m.total_outstanding_balance).toLocaleString()}` : '—'}
                      </td>
                      <td>{m.current_loan_status || 'No active loan'}</td>
                      <td>
                        <button 
                          onClick={() => setLimitTarget(m)}
                          style={{ background: 'none', border: 'none', color: '#1967d2', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Edit Limit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {limitTarget && (
        <EditLimitModal member={limitTarget} onClose={() => setLimitTarget(null)} onSaved={() => { setLimitTarget(null); fetchMembers(); }} />
      )}
    </AdminLayout>
  );
}