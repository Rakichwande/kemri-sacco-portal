import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';
import StatementModal from '../components/StatementModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// Decode a JWT payload without verifying it. Verification is the backend's
// job; the frontend only needs the role claim to decide which buttons to
// show. If the token is absent or malformed, returns null and every
// permission check below fails closed (buttons hidden).
function getCurrentRole() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    // JWT uses base64url — translate to standard base64 before atob()
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = part + '='.repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(atob(padded)).role || null;
  } catch {
    return null;
  }
}

// Role gates for the two privileged actions on this page. Kept in sync with
// middleware/permissions.js — Super Administrator ('admin') and SACCO
// Administrator ('sacco_admin') are the only roles that hold either
// members:set_board_status or members:delete.
//
// The backend enforces these again on the route, so hiding the buttons here
// is UX, not security. A user who forges the request still gets a 403.
const BOARD_STAFF_ROLES = ['admin', 'sacco_admin'];
const DELETE_ROLES = ['admin', 'sacco_admin'];

const EDITABLE_FIELDS = [
  { key: 'full_name', label: 'Full name', type: 'text' },
  { key: 'nationality', label: 'Nationality', type: 'text' },
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'employer', label: 'Employer', type: 'text' },
  { key: 'scheme', label: 'Scheme', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'active', 'inactive'] },
];
const CREATE_FIELDS = [
  { key: 'full_name', label: 'Full name', type: 'text', required: true },
  { key: 'id_number', label: 'National ID', type: 'text', required: true },
  { key: 'phone_number', label: 'Phone number', type: 'text', required: true },
  { key: 'nationality', label: 'Nationality', type: 'text' },
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'employer', label: 'Employer', type: 'text' },
];

const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem' };

function MemberFormModal({ mode, member, onClose, onSaved }) {
  const isCreate = mode === 'create';
  const isView = mode === 'view';
  const fields = isCreate ? CREATE_FIELDS : EDITABLE_FIELDS;
  const [form, setForm] = useState(() => {
    const initial = {};
    fields.forEach((f) => { initial[f.key] = member?.[f.key] ?? ''; });
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = isCreate ? `${API_BASE}/api/members/admin` : `${API_BASE}/api/members/${member.id}`;
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || (err.errors && err.errors.join(', ')) || 'Save failed');
      }
      onSaved();
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 6, width: 440, maxWidth: '90vw', padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 4 }}>
          {isCreate ? 'New Member' : isView ? member.full_name : `Edit ${member.full_name}`}
        </div>
        {!isCreate && <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>{member.reference}</div>}
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        {isView ? (
          <div>
            {[...EDITABLE_FIELDS, { key: 'phone_number', label: 'Phone' }, { key: 'id_number', label: 'National ID' }].map((f) => (
              <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-line)' }}>
                <span style={{ color: 'rgba(31,36,33,0.55)', fontSize: '0.85rem' }}>{f.label}</span>
                <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{member[f.key] || '—'}</span>
              </div>
            ))}
            <button className="admin-btn admin-btn--approve" style={{ marginTop: 16, width: '100%' }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {fields.map((f) => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>
                  {f.label}{f.required && ' *'}
                </div>
                {f.type === 'select' ? (
                  <select
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ ...inputStyle, background: '#fff' }}
                  >
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="admin-btn admin-btn--approve" style={{ flex: 1 }}>
                {submitting ? 'Saving…' : isCreate ? 'Create Member' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Confirmation modal for member deletion. Requires the admin to type the
// member's reference number to enable the Delete button — the reference is
// short, unique, and visible in the row the admin clicked, so a mistyped or
// accidental delete is impossible. The member's name alone would be easier
// to type by accident, which is exactly the wrong property for a
// destructive action.
//
// Handles the 409 (HAS_HISTORY) response inline: the modal stays open, and
// the member's blocking history is shown verbatim. The user's next action
// is "Close", not "try again" — there is nothing to retry. That is a
// different failure mode from a network error, so it is not styled as an
// error banner but as an explanation.
function DeleteMemberModal({ member, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(null);

  const matches = confirmText.trim() === String(member.reference || '');

  const handleDelete = async () => {
    if (!matches) return;
    setSubmitting(true);
    setError(null);
    setBlocked(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/members/${member.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        // Member has transaction history — legitimate business outcome.
        setBlocked({ message: data.error, counts: data.counts });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onDeleted(data);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 6, width: 440, maxWidth: '90vw', padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, color: '#a13030', marginBottom: 8 }}>
          Delete member
        </div>

        {blocked ? (
          <>
            <div style={{ padding: 12, background: '#fbf3e6', border: '1px solid #e8d4a8', borderRadius: 4, fontSize: '0.85rem', color: '#7a5a10', marginBottom: 16 }}>
              {blocked.message}
            </div>
            {blocked.counts && (
              <div style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.6)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
                On record: {Object.entries(blocked.counts)
                  .filter(([, n]) => Number(n) > 0)
                  .map(([k, n]) => `${n} ${k}`)
                  .join(', ')}
              </div>
            )}
            <button onClick={onClose} style={{ width: '100%', padding: '9px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
              Close
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '0.88rem', color: 'rgba(31,36,33,0.7)', marginBottom: 16, lineHeight: 1.5 }}>
              You are about to permanently delete{' '}
              <strong style={{ color: 'var(--color-forest-deep)' }}>{member.full_name}</strong>{' '}
              (ref <span style={{ fontFamily: 'var(--font-mono)' }}>{member.reference}</span>).
              This cannot be undone. Members with transaction history cannot be deleted.
            </div>

            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 4 }}>
              Type <span style={{ fontFamily: 'var(--font-mono)', color: '#a13030' }}>{member.reference}</span> to confirm
            </div>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={String(member.reference || '')}
              style={{ ...inputStyle, marginBottom: 12, fontFamily: 'var(--font-mono)' }}
            />

            {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '9px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!matches || submitting}
                onClick={handleDelete}
                style={{
                  flex: 1,
                  padding: '9px',
                  border: 'none',
                  borderRadius: 4,
                  background: matches ? '#a13030' : '#d9b8b8',
                  color: '#fff',
                  cursor: matches && !submitting ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                }}
              >
                {submitting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MemberDirectory() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { mode, member }
  const [statementMemberId, setStatementMemberId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // member pending deletion
  const [togglingId, setTogglingId] = useState(null); // member id currently being toggled

  // Role is read from the JWT once per mount. If it changes (user re-logs),
  // the component remounts anyway, so a one-time read is correct here.
  const role = getCurrentRole();
  const canToggleBoard = BOARD_STAFF_ROLES.includes(role);
  const canDelete = DELETE_ROLES.includes(role);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/members`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setMembers(await res.json());
    } catch (err) {
      console.error('Fetch members error:', err);
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.reference?.toLowerCase().includes(q) ||
      m.phone_number?.toLowerCase().includes(q) ||
      m.id_number?.toLowerCase().includes(q) ||
      m.employer?.toLowerCase().includes(q)
    );
  });

  const loanBadge = (status) => {
    if (!status) return <span style={{ color: 'rgba(31,36,33,0.4)', fontSize: '0.82rem' }}>No loan</span>;
    return <span className={`admin-badge admin-badge--${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  const statusBadge = (status) => {
    const colors = {
      active: { background: 'var(--color-sage)', color: 'var(--color-forest-deep)' },
      inactive: { background: '#e5e2da', color: 'rgba(31,36,33,0.55)' },
      pending: { background: 'var(--color-gold-soft)', color: '#7a5a10' },
    };
    return <span className="admin-badge" style={colors[status] || colors.pending}>{status || 'pending'}</span>;
  };

  // Board/Staff pill. Deliberately distinct from the status badge (which is
  // sage-green for active) — amber conveys "elevated privilege" rather than
  // state, so it reads as a category marker, not a status.
  const boardStaffBadge = () => (
    <span
      className="admin-badge"
      style={{
        background: 'var(--color-gold-soft)',
        color: '#7a5a10',
        fontSize: '0.62rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        marginLeft: 8,
        verticalAlign: 'middle',
        fontWeight: 600,
      }}
    >
      Board/Staff
    </span>
  );

  const handleSaved = () => {
    setModal(null);
    fetchMembers();
  };

  const handleToggleBoard = async (member) => {
    const next = !member.is_board_staff;
    setTogglingId(member.id);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/members/${member.id}/board-staff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_board_staff: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchMembers();
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleted = () => {
    setDeleteTarget(null);
    fetchMembers();
  };

  return (
    <AdminLayout title="Member Directory" lede={`${members.length} members · searchable register of all SACCO members.`}>
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search name, reference, phone, ID, employer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--color-line)', borderRadius: 4, fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}
        />
        <button className="admin-btn admin-btn--approve" onClick={() => setModal({ mode: 'create', member: null })}>
          + New Member
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No members match that search.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Reference</th>
                <th>Phone</th>
                <th>National ID</th>
                <th>Employer</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Savings</th>
                <th>Loan</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>
                    {m.full_name}
                    {m.is_board_staff && boardStaffBadge()}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>{m.reference}</td>
                  <td style={{ color: 'rgba(31,36,33,0.6)' }}>{m.phone_number}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{m.id_number}</td>
                  <td>{m.employer || '—'}</td>
                  <td>{statusBadge(m.status)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatKES(m.savings_balance)}</td>
                  <td>{loanBadge(m.current_loan_status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setModal({ mode: 'view', member: m })} style={{ background: 'none', border: 'none', color: 'var(--color-forest)', fontSize: '0.82rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        View
                      </button>
                      <button onClick={() => setModal({ mode: 'edit', member: m })} style={{ background: 'none', border: 'none', color: 'var(--color-forest)', fontSize: '0.82rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        Edit
                      </button>
                      <button onClick={() => setStatementMemberId(m.id)} style={{ background: 'none', border: 'none', color: 'var(--color-forest)', fontSize: '0.82rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        Statement
                      </button>
                      {canToggleBoard && (
                        <button
                          onClick={() => handleToggleBoard(m)}
                          disabled={togglingId === m.id}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#7a5a10',
                            fontSize: '0.82rem',
                            cursor: togglingId === m.id ? 'wait' : 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                            opacity: togglingId === m.id ? 0.5 : 1,
                          }}
                        >
                          {togglingId === m.id ? '…' : m.is_board_staff ? 'Revoke Board' : 'Make Board'}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(m)}
                          style={{ background: 'none', border: 'none', color: '#a13030', fontSize: '0.82rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <MemberFormModal
          mode={modal.mode}
          member={modal.member}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {statementMemberId && (
        <StatementModal memberId={statementMemberId} onClose={() => setStatementMemberId(null)} />
      )}

      {deleteTarget && (
        <DeleteMemberModal
          member={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </AdminLayout>
  );
}

export default MemberDirectory;