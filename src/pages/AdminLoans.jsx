import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function AdminLoans() {
  const { user, logout } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, disbursed: 0, repaid: 0, rejected: 0 });
  const [receipt, setReceipt] = useState({});

  // Helper to get token from localStorage
  const getToken = () => localStorage.getItem('token');

  // Fetch loans with token
  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No token found');
      }
      const res = await fetch(`${API_BASE}/api/loans/admin/list`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLoans(data);
      setStats({
        total: data.length,
        pending: data.filter(l => l.status === 'pending').length,
        approved: data.filter(l => l.status === 'approved').length,
        disbursed: data.filter(l => l.status === 'disbursed').length,
        repaid: data.filter(l => l.status === 'repaid').length,
        rejected: data.filter(l => l.status === 'rejected').length,
      });
    } catch (err) {
      console.error('Fetch loans error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // Approve loan
  const handleApprove = async (loanId) => {
    if (!window.confirm('Approve this loan?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/approve/${loanId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminNotes: 'Approved via Admin' })
      });
      if (!res.ok) throw new Error('Failed to approve');
      alert('✅ Loan Approved!');
      fetchLoans();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Disburse loan
  const handleDisburse = async (loanId) => {
    const mpesaReceipt = receipt[loanId]?.trim() || '';
    if (!mpesaReceipt && !window.confirm('No receipt entered. Continue?')) return;
    if (!window.confirm('Mark as disbursed?')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/disburse/${loanId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mpesaReceipt: mpesaReceipt || 'Manual Transfer' })
      });
      if (!res.ok) throw new Error('Failed to disburse');
      alert('✅ Loan Disbursed!');
      setReceipt({ ...receipt, [loanId]: '' });
      fetchLoans();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Reject loan
  const handleReject = async (loanId) => {
    const adminNotes = window.prompt('Reason for rejecting this loan (shown to the member):', '');
    if (adminNotes === null) return; // cancelled
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/loans/reject/${loanId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminNotes })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject');
      }
      alert('Loan rejected.');
      fetchLoans();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  // Format currency
  const formatKES = (amount) => `KES ${Number(amount).toLocaleString()}`;

  // Status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      disbursed: 'bg-purple-100 text-purple-800',
      repaid: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Loading loans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">❌ Error</h2>
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
        <h1 className="text-2xl font-bold text-gray-800">🏦 KEMRI SACCO Admin</h1>
        <div className="flex items-center gap-4">
          <Link to="/admin/audit-trail" className="text-sm text-gray-600 hover:text-gray-900 underline">
            Audit Trail
          </Link>
          <span className="text-sm text-gray-600">Welcome, {user?.full_name || 'Admin'}</span>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow border-l-4 border-gray-500">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Loans</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-purple-600">{stats.disbursed}</div>
          <div className="text-sm text-gray-500">Disbursed</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">{stats.repaid}</div>
          <div className="text-sm text-gray-500">Repaid</div>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-500">Rejected</div>
        </div>
      </div>

      {/* Loans Table */}
      {loans.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No loans found.</p>
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
              {loans.map((loan) => (
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
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(loan.id)}
                          className="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 text-sm"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleReject(loan.id)}
                          className="bg-red-600 text-white px-4 py-1.5 rounded hover:bg-red-700 text-sm"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                    {loan.status === 'approved' && (
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          placeholder="M-Pesa Receipt"
                          className="border border-gray-300 rounded px-2 py-1 w-36 text-sm"
                          value={receipt[loan.id] || ''}
                          onChange={(e) => setReceipt({ ...receipt, [loan.id]: e.target.value })}
                        />
                        <button
                          onClick={() => handleDisburse(loan.id)}
                          className="bg-purple-600 text-white px-4 py-1.5 rounded hover:bg-purple-700 text-sm"
                        >
                          💰 Disburse
                        </button>
                      </div>
                    )}
                    {loan.status === 'disbursed' && <span className="text-green-600 text-sm">✅ Disbursed</span>}
                    {loan.status === 'repaid' && <span className="text-gray-500 text-sm">✔️ Repaid</span>}
                    {loan.status === 'rejected' && <span className="text-red-500 text-sm">❌ Rejected</span>}
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