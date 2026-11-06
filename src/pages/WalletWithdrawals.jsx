import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import LoadingState, { friendlyErrorMessage } from '../components/LoadingState';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

const TABS = [
  { key: 'all', label: 'All Wallets' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'school', label: 'School' },
  { key: 'general', label: 'General' },
];

export default function WalletWithdrawals() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/wallet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch wallet withdrawals');
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const filtered = transactions.filter(t => {
    if (activeTab === 'all') return true;
    return t.wallet_type === activeTab;
  });

  // FIXED: Using Math.abs() because the DB stores debits as negative amounts
  const totalWithdrawn = filtered
    .filter(t => t.transaction_type === 'withdrawal')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  return (
    <AdminLayout title="Wallet Withdrawals" lede="Monitor all withdrawals from Member SACCO Wallets to M-Pesa.">
      {error && <div className="error-banner" style={{ marginBottom: 20 }}>{error}</div>}

      {/* TABS & STATS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', borderRadius: 4, fontSize: '0.85rem', fontWeight: 500,
              cursor: 'pointer', border: '1px solid var(--color-line)',
              background: activeTab === tab.key ? 'var(--color-forest-deep)' : '#fff',
              color: activeTab === tab.key ? '#fff' : 'var(--color-ink)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-ink)' }}>
          <div className="admin-stat-card__value">{filtered.length}</div>
          <div className="admin-stat-card__label">Total Withdrawal Requests</div>
        </div>
        <div className="admin-stat-card" style={{ '--stat-accent': 'var(--color-forest)' }}>
          <div className="admin-stat-card__value">{formatKES(totalWithdrawn)}</div>
          <div className="admin-stat-card__label">Total Successfully Withdrawn</div>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <div className="admin-table-card" style={{ padding: 48, textAlign: 'center', color: 'rgba(31,36,33,0.5)' }}>
          No wallet withdrawals found for this category.
        </div>
      ) : (
        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Member Ref</th>
                <th>Wallet Type</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th>M-Pesa Ref / Error</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isSuccess = t.transaction_type === 'withdrawal';
                return (
                  <tr key={t.id}>
                    <td style={{ color: 'rgba(31,36,33,0.6)' }}>
                      {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.full_name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>{t.member_reference}</td>
                    <td>
                      <span style={{
                        background: t.wallet_type === 'emergency' ? '#ffedd5' : (t.wallet_type === 'school' ? '#f3e8ff' : '#e0f2fe'),
                        color: t.wallet_type === 'emergency' ? '#c2410c' : (t.wallet_type === 'school' ? '#7e22ce' : '#0369a1'),
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase'
                      }}>
                        {t.wallet_type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: isSuccess ? 'var(--color-forest)' : 'inherit' }}>
                      {formatKES(Math.abs(t.amount))}
                    </td>
                    <td>
                      <span style={{
                        background: isSuccess ? '#dcfce7' : '#fee2e2',
                        color: isSuccess ? '#15803d' : '#b91c1c',
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase'
                      }}>
                        {isSuccess ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'rgba(31,36,33,0.6)' }}>
                      {isSuccess ? t.reference : 'B2C Rejected / Refunded'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}