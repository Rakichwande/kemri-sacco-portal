import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import AdminLayout from '../components/AdminLayout';

const formatKES = (v) => `KES ${Number(v).toLocaleString()}`;
const formatDate = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  processed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function WithdrawalQueue() {
  const [tab, setTab] = useState('pending');
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [processing, setProcessing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [receipt, setReceipt] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, listRes] = await Promise.all([
        api.get('/api/withdrawals/summary'),
        tab === 'pending'
          ? api.get('/api/withdrawals/pending')
          : api.get(`/api/withdrawals?status=${tab}&limit=200`),
      ]);
      setSummary(summaryRes.data);
      setRows(listRes.data);
    } catch (err) {
      console.error('Withdrawal queue load error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function handleProcess(e) {
    e.preventDefault();
    if (!receipt.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/withdrawals/${processing.id}/process`, { mpesa_receipt: receipt.trim() });
      setProcessing(null);
      setReceipt('');
      await load();
    } catch (err) {
      alert('Failed to process: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/api/withdrawals/${rejecting.id}/reject`, { notes: rejectReason.trim() || null });
      setRejecting(null);
      setRejectReason('');
      await load();
    } catch (err) {
      alert('Failed to reject: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout
      title="Withdrawal Requests"
      lede="Members request withdrawals via USSD. Send the M-Pesa payout manually, then mark the request processed with the real receipt."
    >
      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-amber-500">
            <div className="text-2xl font-bold">{summary.pending_count}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Pending Requests</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-amber-500">
            <div className="text-2xl font-bold">{formatKES(summary.pending_total)}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Pending Amount</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-emerald-500">
            <div className="text-2xl font-bold">{summary.processed_today}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Processed Today</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-emerald-500">
            <div className="text-2xl font-bold">{formatKES(summary.processed_today_total)}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Paid Today</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['pending', 'processed', 'rejected'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${
              tab === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t}
            {t === 'pending' && summary?.pending_count > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white">
                {summary.pending_count}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={load} className="px-4 py-2 rounded-md text-sm bg-white border border-slate-200 hover:bg-slate-50">
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Error: {error}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No {tab} withdrawal requests.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt / Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{w.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{w.phone_number}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatKES(w.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(w.requested_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${STATUS_COLORS[w.status]}`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {w.mpesa_receipt ? <div className="font-mono">{w.mpesa_receipt}</div> : null}
                    {w.notes ? <div className="italic text-slate-500">{w.notes}</div> : null}
                    {!w.mpesa_receipt && !w.notes ? '—' : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {w.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setProcessing(w); setReceipt(''); }}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Process
                        </button>
                        <button
                          onClick={() => { setRejecting(w); setRejectReason(''); }}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Process Modal */}
      {processing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => !submitting && setProcessing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleProcess} className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Mark Withdrawal Processed</h2>
            <p className="text-sm text-slate-500 mb-4">
              {processing.full_name} · {formatKES(processing.amount)}
            </p>
            <p className="text-xs text-slate-500 mb-4 bg-amber-50 border border-amber-200 rounded p-3">
              <strong>Reminder:</strong> Send the M-Pesa payment to {processing.phone_number} first, then paste the receipt number below.
            </p>
            <label className="block text-xs font-medium text-slate-600 mb-1">M-Pesa Receipt Number</label>
            <input
              type="text"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              placeholder="e.g. UINKU7NCY4"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setProcessing(null)} disabled={submitting}
                className="px-4 py-2 rounded-md text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !receipt.trim()}
                className="px-4 py-2 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting ? 'Processing…' : 'Confirm Processed'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Modal */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => !submitting && setRejecting(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleReject} className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Reject Withdrawal Request</h2>
            <p className="text-sm text-slate-500 mb-4">
              {rejecting.full_name} · {formatKES(rejecting.amount)}
            </p>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Insufficient savings balance, member requested by mistake…"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejecting(null)} disabled={submitting}
                className="px-4 py-2 rounded-md text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {submitting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}