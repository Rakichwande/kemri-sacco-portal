import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LABELS = {
  database: 'Database',
  authentication: 'Authentication',
  daraja: 'Daraja (M-Pesa)',
  africastalking: "Africa's Talking",
  ussd_gateway: 'USSD Gateway',
};

const STATUS_COLORS = {
  operational: { color: 'var(--color-forest)', badge: { background: 'var(--color-sage)', color: 'var(--color-forest-deep)' } },
  degraded: { color: 'var(--color-gold)', badge: { background: 'var(--color-gold-soft)', color: '#7a5a10' } },
  down: { color: 'var(--color-error)', badge: { background: '#f5d9d4', color: 'var(--color-error)' } },
  'not configured': { color: 'rgba(31,36,33,0.4)', badge: { background: '#e5e2da', color: 'rgba(31,36,33,0.55)' } },
  unknown: { color: 'rgba(31,36,33,0.4)', badge: { background: '#e5e2da', color: 'rgba(31,36,33,0.55)' } },
};

function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/system-health`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setHealth(await res.json());
    } catch (err) {
      console.error('Fetch health error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);

  return (
    <AdminLayout title="System Health" lede="Real checks against the database and configured integrations — not a static mockup.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={fetchHealth} className="admin-btn admin-btn--approve">
          {loading ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {health && (
        <div style={{
          padding: '12px 16px', borderRadius: 4, marginBottom: 20, fontSize: '0.88rem',
          background: health.overallStatus === 'operational' ? 'var(--color-sage)' : 'var(--color-gold-soft)',
          color: health.overallStatus === 'operational' ? 'var(--color-forest-deep)' : '#7a5a10',
        }}>
          {health.overallStatus === 'operational' ? 'All systems operational.' : 'Some services are degraded.'}
          {' '}Last checked {new Date(health.checkedAt).toLocaleTimeString()}.
        </div>
      )}

      {loading && !health ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(31,36,33,0.5)' }}>Checking…</div>
      ) : health && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {Object.entries(health.checks).map(([key, check]) => (
              <div key={key} className="admin-table-card" style={{ padding: 18, borderLeft: `3px solid ${STATUS_COLORS[check.status]?.color || 'var(--color-line)'}` }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'rgba(31,36,33,0.5)', marginBottom: 8 }}>
                  {LABELS[key] || key}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[check.status]?.color || 'gray', display: 'inline-block' }} />
                  <span style={{ fontWeight: 600, fontSize: '1.05rem', textTransform: 'capitalize' }}>{check.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.55)' }}>{check.detail}</div>
              </div>
            ))}
          </div>

          <div className="admin-table-card" style={{ padding: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 4 }}>
              Recent USSD Sessions
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)', marginBottom: 16 }}>
              Actual logged outcomes from the USSD gateway — each row is one menu screen served, not a full session.
            </div>

            {health.recentSessions.length === 0 ? (
              <div style={{ color: 'rgba(31,36,33,0.5)', fontSize: '0.88rem', padding: '12px 0' }}>
                No USSD activity logged yet.
              </div>
            ) : (
              <table className="admin-table" style={{ marginLeft: -8 }}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Phone</th>
                    <th>Input</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Duration</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {health.recentSessions.map((s) => (
                    <tr key={s.id}>
                      <td style={{ color: 'rgba(31,36,33,0.6)', whiteSpace: 'nowrap' }}>
                        {new Date(s.created_at).toLocaleTimeString()}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{s.phone_number}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.55)' }}>{s.input_text || '(menu)'}</td>
                      <td>
                        <span className="admin-badge" style={STATUS_COLORS[s.status]?.badge}>{s.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{s.duration_ms} ms</td>
                      <td style={{ color: 'rgba(31,36,33,0.7)' }}>{s.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}

export default SystemHealth;
