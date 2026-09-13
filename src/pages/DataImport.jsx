import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TEMPLATE_COLUMNS = ['full_name', 'reference_number', 'phone', 'national_id', 'employer', 'join_date'];
const REQUIRED_COLUMNS = ['full_name', 'phone', 'national_id'];

// Small hand-rolled CSV parser - no library is installed, and a well-formed
// export from Excel/Sheets (the realistic source here) rarely needs more
// than basic comma-splitting plus quoted-field support.
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).filter((l) => l.trim().length > 0).map((line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current); current = ''; }
      else { current += char; }
    }
    values.push(current);
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  });
  return { headers, rows };
}

function downloadTemplate() {
  const csv = TEMPLATE_COLUMNS.join(',') + '\n' + 'Jane Wanjiru,KEMRI-0099,0712345678,29876543,KEMRI Nairobi,2019-03-15\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kemri-sacco-member-import-template.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

function DataImport() {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null); // { headers, rows }
  const [parseError, setParseError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const { headers, rows } = parseCsv(evt.target.result);
        const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          setParseError(`CSV is missing required column(s): ${missing.join(', ')}`);
          setParsed(null);
          return;
        }
        if (rows.length === 0) {
          setParseError('No data rows found in this file.');
          setParsed(null);
          return;
        }
        setParsed({ headers, rows });
      } catch (err) {
        setParseError('Could not read this file as CSV.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    if (!window.confirm(`Import ${parsed.rows.length} member(s)? Existing members (matched by phone or National ID) will be skipped, not overwritten.`)) return;
    setSubmitting(true);
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/members/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rows: parsed.rows }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }
      setResult(await res.json());
      setParsed(null);
      setFileName('');
    } catch (err) {
      setParseError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Data Import" lede="Upload a CSV to batch import member records.">
      <div className="admin-table-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
            Member Records
          </div>
          <button
            onClick={downloadTemplate}
            style={{ padding: '8px 14px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            ↓ Download CSV template
          </button>
        </div>

        <div style={{
          border: '2px dashed var(--color-line)', borderRadius: 6, padding: 32,
          textAlign: 'center', marginBottom: 12,
        }}>
          <div style={{ marginBottom: 10, color: 'rgba(31,36,33,0.6)' }}>Select a CSV file to import</div>
          <input type="file" accept=".csv" onChange={handleFile} />
          {fileName && <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'rgba(31,36,33,0.6)' }}>{fileName}</div>}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.55)' }}>
          <strong>Expected columns:</strong> full_name*, phone*, national_id*, reference_number, employer, join_date
          <div style={{ marginTop: 4 }}>(* required. reference_number and join_date are optional — used to preserve a pre-existing SACCO number and true join date, if known.)</div>
        </div>
      </div>

      {parseError && <div className="error-banner" style={{ marginBottom: 20 }}>{parseError}</div>}

      {parsed && (
        <div className="admin-table-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 500 }}>{parsed.rows.length} row(s) ready to import</div>
            <button onClick={handleImport} disabled={submitting} className="admin-btn admin-btn--approve">
              {submitting ? 'Importing…' : `Import ${parsed.rows.length} Member(s)`}
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>{parsed.headers.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {parsed.rows.slice(0, 5).map((row, i) => (
                <tr key={i}>{parsed.headers.map((h) => <td key={h}>{row[h] || '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
          {parsed.rows.length > 5 && (
            <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.5)', marginTop: 8 }}>
              Showing first 5 of {parsed.rows.length} rows.
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="admin-table-card" style={{ padding: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)', marginBottom: 12 }}>
            Import Complete
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-forest)' }}>{result.created}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.55)' }}>Created</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-error)' }}>{result.skipped.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.55)' }}>Skipped</div>
            </div>
          </div>
          {result.skipped.length > 0 && (
            <table className="admin-table">
              <thead><tr><th>Row</th><th>Reason</th></tr></thead>
              <tbody>
                {result.skipped.map((s, i) => (
                  <tr key={i}><td>{s.row}</td><td>{s.reason}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.45)', marginTop: 16 }}>
        This only imports member profile data. Savings and loan balances are never imported here —
        those come exclusively from real contribution and repayment records, so every number the
        Dashboard and Financial Reports show can always be traced back to an actual transaction.
      </p>
    </AdminLayout>
  );
}

export default DataImport;
