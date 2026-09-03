import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function AdminLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, disbursed: 0, repaid: 0 });
  const [receipt, setReceipt] = useState({});
  const [error, setError] = useState(null);

  // Fetch all loans
  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/loans/admin/list`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setLoans(data);
      
      // Calculate stats
      const statsData = {
        total: data.length,
        pending: data.filter(l => l.status === 'pending').length,
        approved: data.filter(l => l.status === 'approved').length,
        disbursed: data.filter(l => l.status === 'disbursed').length,
        repaid: data.filter(l => l.status === 'repaid').length,
      };
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch loans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // Approve Loan
  const handleApprove = async (loanId) => {
    if (!window.confirm('✅ Approve this loan? The member will receive an SMS confirmation.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/loans/approve/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: 'Approved via Admin Panel' }),
      });
      if (res.ok) {
        alert('✅ Loan Approved! SMS sent to member.');
        fetchLoans();
      } else {
        const err = await res.json();
        alert(`❌ Failed: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Network error. Check if backend is running.');
    }
  };

  // Mark as Manually Disbursed
  const handleDisburse = async (loanId) => {
    const mpesaReceipt = receipt[loanId]?.trim() || '';
    if (!mpesaReceipt) {
      if (!window.confirm('⚠️ No M-Pesa receipt entered. Continue without receipt?')) return;
    }
    if (!window.confirm('💰 Mark this loan as disbursed? Member will receive an SMS.')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/loans/disburse/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpesaReceipt: mpesaReceipt || 'Manual Transfer' }),
      });
      if (res.ok) {
        alert('✅ Loan marked as Disbursed! SMS sent to member.');
        setReceipt({ ...receipt, [loanId]: '' });
        fetchLoans();
      } else {
        const err = await res.json();
        alert(`❌ Failed: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Network error. Check if backend is running.');
    }
  };

  // Filter loans
  const filteredLoans = filter === 'all' 
    ? loans 
    : loans.filter(l => l.status === filter);

  // Format currency
  const formatKES = (amount) => `KES ${Number(amount).toLocaleString()}`;

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      disbursed: 'bg-purple-100 text-purple-800',
      repaid: 'bg-green-100 text-green-800',
      default: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || colors.default;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-gray-600">Loading loans...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">❌</div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Loans</h2>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchLoans}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Make sure your backend is running at <code className="bg-gray-200 px-2 py-1 rounded">{API_BASE}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🏦 KEMRI SACCO</h1>
          <p className="text-gray-500 text-sm">Admin Loan Management Dashboard</p>
        </div>
        <button 
          onClick={fetchLoans}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Loans</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-purple-600">{stats.disbursed}</div>
          <div className="text-sm text-gray-500">Disbursed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">{stats.repaid}</div>
          <div className="text-sm text-gray-500">Re paid</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          All ({stats.total})
        </button>
        <button 
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 hover:bg-yellow-200'}`}
        >
          Pending ({stats.pending})
        </button>
        <button 
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg ${filter === 'approved' ? 'bg-blue-600 text-white' : 'bg-blue-100 hover:bg-blue-200'}`}
        >
          Approved ({stats.approved})
        </button>
        <button 
          onClick={() => setFilter('disbursed')}
          className={`px-4 py-2 rounded-lg ${filter === 'disbursed' ? 'bg-purple-600 text-white' : 'bg-purple-100 hover:bg-purple-200'}`}
        >
          Disbursed ({stats.disbursed})
        </button>
        <button 
          onClick={() => setFilter('repaid')}
          className={`px-4 py-2 rounded-lg ${filter === 'repaid' ? 'bg-green-600 text-white' : 'bg-green-100 hover:bg-green-200'}`}
        >
          Re paid ({stats.repaid})
        </button>
      </div>

      {/* Loans Table */}
      {filteredLoans.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500 text-lg">No {filter !== 'all' ? filter : ''} loans found.</p>
          <p className="text-gray-400 text-sm">Apply for a test loan via USSD (Option 4) to see it here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Loan ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Member</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Phone</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Principal</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Monthly</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">#{loan.id}</td>
                  <td className="px-4 py-3 text-sm font-medium">{loan.member_name || loan.member_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{loan.phone_number || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatKES(loan.principal)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{formatKES(loan.total_repayment)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatKES(loan.monthly_installment)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(loan.status)}`}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {loan.status === 'pending' && (
                      <button 
                        onClick={() => handleApprove(loan.id)}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 text-sm font-medium transition"
                      >
                        ✅ Approve
                      </button>
                    )}
                    {loan.status === 'approved' && (
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          placeholder="M-Pesa Receipt"
                          className="border border-gray-300 rounded px-2 py-1 w-36 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          value={receipt[loan.id] || ''}
                          onChange={(e) => setReceipt({ ...receipt, [loan.id]: e.target.value })}
                        />
                        <button 
                          onClick={() => handleDisburse(loan.id)}
                          className="bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 text-sm font-medium transition"
                        >
                          💰 Disburse
                        </button>
                      </div>
                    )}
                    {loan.status === 'disbursed' && (
                      <span className="text-green-600 text-sm font-medium">✅ Disbursed</span>
                    )}
                    {loan.status === 'repaid' && (
                      <span className="text-gray-500 text-sm">✔️ Re paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-400">
        KEMRI SACCO Digital Platform v1.0 • {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

export default AdminLoans;