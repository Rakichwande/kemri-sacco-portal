import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TEMPLATE_COLUMNS = ['full_name', 'national_id', 'phone_number', 'reference_number', 'employer', 'join_date'];
const REQUIRED_FIELDS = ['full_name', 'national_id'];

const HEADER_ALIASES = {
  full_name: ['fullname', 'name', 'membername', 'member', 'fullnames'],
  national_id: ['nationalid', 'idnumber', 'id', 'nationalidnumber', 'idno', 'idnos', 'nationalids'],
  phone_number: [
    'phone', 'phonenumber', 'phonenumbers', 'phoneno', 'phno',
    'tel', 'telno', 'telephone', 'telnumber',
    'mobile', 'mobileno', 'mobilenumber',
    'cell', 'cellno', 'cellphone',
    'msisdn',
    'contacts', 'contact', 'contactno', 'contactnumber',
  ],
  reference_number: [
    'referencenumber', 'reference', 'ref', 'refno',
    'pno', 'sacconumber', 'saccoid', 'saccono',
    'membernumber', 'membershipnumber', 'memberno', 'memberid',
  ],
  employer: ['employer', 'employername', 'company', 'organization', 'organisation', 'workplace'],
  join_date: ['joindate', 'datejoined', 'joinedon', 'membershipdate', 'registrationdate', 'dateofjoining'],
};

function normalizeHeader(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapHeaders(headerRow) {
  const mapping = {};
  headerRow.forEach((cell, index) => {
    const norm = normalizeHeader(cell);
    if (!norm) return;
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm) && !(field in mapping)) {
        mapping[field] = index;
        return;
      }
    }
  });
  return mapping;
}

function countMatches(row) {
  return Object.keys(mapHeaders(row)).length;
}

async function parseFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('The file has no sheets.');

  const sheet = workbook.Sheets[firstSheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true,
  });

  if (grid.length === 0) throw new Error('The file is empty.');

  let headerRowIndex = -1;
  let headerMapping = null;
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    const matches = countMatches(grid[i]);
    if (matches >= 2) {
      headerRowIndex = i;
      headerMapping = mapHeaders(grid[i]);
      break;
    }
  }

  if (headerRowIndex === -1 || !headerMapping) {
    throw new Error(
      'Could not find a header row. The first column of your file should be one of: ' +
      TEMPLATE_COLUMNS.join(', ')
    );
  }

  const missingRequired = REQUIRED_FIELDS.filter((f) => !(f in headerMapping));
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required column(s): ${missingRequired.join(', ')}. ` +
      `Found columns: ${Object.keys(headerMapping).join(', ') || '(none recognized)'}`
    );
  }

  const rows = [];
  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const raw = grid[i];
    const isEmpty = raw.every((cell) => String(cell || '').trim() === '');
    if (isEmpty) continue;

    const row = { sourceRow: i + 1 };
    for (const [field, colIndex] of Object.entries(headerMapping)) {
      const value = raw[colIndex];
      row[field] = value === undefined || value === null ? '' : String(value).trim();
    }
    rows.push(row);
  }

  return {
    headers: Object.keys(headerMapping),
    rows,
  };
}

function downloadTemplate() {
  const csv =
    TEMPLATE_COLUMNS.join(',') +
    '\n' +
    'Jane Wanjiru,29876543,0712345678,KEMRI-0099,KEMRI Nairobi,2019-03-15\n';
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
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // 2026-10-29: State to control the custom confirmation modal
  const [confirmData, setConfirmData] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setParseError(null);
    setCopied(false);

    try {
      const { headers, rows } = await parseFile(file);

      if (rows.length === 0) {
        setParseError('No data rows found in this file.');
        setParsed(null);
        return;
      }
      if (rows.length > 5000) {
        setParseError(
          `This file has ${rows.length} rows, but imports are capped at 5000. Split the file into smaller batches.`
        );
        setParsed(null);
        return;
      }
      setParsed({ headers, rows });
    } catch (err) {
      console.error('Parse error:', err);
      setParseError(err.message || 'Could not read this file. Supported formats: .xlsx, .csv');
      setParsed(null);
    }
  };

  // 1. Opens the modal instead of a native window.confirm
  const triggerImportConfirm = () => {
    if (!parsed) return;
    setConfirmData({ count: parsed.rows.length });
  };

  // 2. The actual execution function called from the modal
  const executeImport = async () => {
    if (!parsed) return;
    setConfirmData(null); // Close modal
    setSubmitting(true);
    setResult(null);
    setParseError(null);
    
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

  const copyErrors = async () => {
    if (!result?.skipped?.length) return;
    const text = result.skipped
      .map((s) => `Row ${s.row}: ${s.reason}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <AdminLayout title="Data Import" lede="Upload a spreadsheet (.xlsx) or CSV to batch import member records.">
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
          <div style={{ marginBottom: 10, color: 'rgba(31,36,33,0.6)' }}>
            Select an Excel (.xlsx) or CSV file
          </div>
          <input
            type="file"
            accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={handleFile}
          />
          {fileName && (
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'rgba(31,36,33,0.6)' }}>
              {fileName}
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.55)' }}>
          <strong>Recognized columns:</strong> full_name*, national_id*, phone_number, reference_number, employer, join_date
          <div style={{ marginTop: 4 }}>
            (* required. phone_number is optional for legacy members without one on file —
            their USSD/SMS won't work until a phone is added via the member's edit form.)
          </div>
          <div style={{ marginTop: 4 }}>
            Column names are case-insensitive and underscore-insensitive. Common aliases
            (P/NO for reference_number, CONTACTS for phone_number, etc.) are recognized automatically.
          </div>
        </div>
      </div>

      {parseError && <div className="error-banner" style={{ marginBottom: 20 }}>{parseError}</div>}

      {parsed && (
        <div className="admin-table-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 500 }}>
              {parsed.rows.length} row(s) ready to import ·{' '}
              <span style={{ fontSize: '0.85rem', color: 'rgba(31,36,33,0.55)' }}>
                mapped columns: {parsed.headers.join(', ')}
              </span>
            </div>
            <button onClick={triggerImportConfirm} disabled={submitting} className="admin-btn admin-btn--approve">
              {submitting ? 'Importing…' : `Import ${parsed.rows.length} Member(s)`}
            </button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Source Row</th>
                {parsed.headers.map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(0, 5).map((row) => (
                <tr key={row.sourceRow}>
                  <td style={{ color: 'rgba(31,36,33,0.5)', fontSize: '0.8rem' }}>{row.sourceRow}</td>
                  {parsed.headers.map((h) => (
                    <td key={h}>{row[h] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.rows.length > 5 && (
            <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.5)', marginTop: 8 }}>
              Showing first 5 of {parsed.rows.length} rows. Source row numbers refer to the row in your spreadsheet.
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="admin-table-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-forest-deep)' }}>
              Import Complete
            </div>
            {result.skipped.length > 0 && (
              <button
                onClick={copyErrors}
                style={{ padding: '6px 12px', border: '1px solid var(--color-line)', borderRadius: 4, background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {copied ? '✓ Copied' : 'Copy all errors'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-forest)' }}>
                {result.created}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.55)' }}>Imported</div>
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 600, color: result.skipped.length ? 'var(--color-error)' : 'rgba(31,36,33,0.3)' }}>
                {result.skipped.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(31,36,33,0.55)' }}>Skipped</div>
            </div>
          </div>

          {result.skipped.length > 0 && (
            <>
              <div style={{ fontSize: '0.85rem', color: 'rgba(31,36,33,0.6)', marginBottom: 8 }}>
                Skipped rows — the "Row" column refers to the row in your original spreadsheet.
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--color-line)', borderRadius: 4 }}>
                <table className="admin-table" style={{ margin: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f7f6f3', zIndex: 1 }}>
                    <tr><th style={{ width: 80 }}>Row</th><th>Reason</th></tr>
                  </thead>
                  <tbody>
                    {result.skipped.map((s, i) => (
                      <tr key={i}><td>{s.row}</td><td>{s.reason}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: 'rgba(31,36,33,0.45)', marginTop: 16 }}>
        This only imports member profile data. Savings and loan balances are never imported here —
        those come exclusively from real contribution and repayment records, so every number the
        Dashboard and Financial Reports show can always be traced back to an actual transaction.
      </p>

      {/* ======================================================= */}
      {/* CUSTOM CONFIRM MODAL (Replaces the ugly purple OS one) */}
      {/* ======================================================= */}
      {confirmData && (
        <div 
          onClick={() => setConfirmData(null)} 
          style={{ position: 'fixed', inset: 0, background: 'rgba(31,36,33,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 450, width: '90%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>📁</div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest-deep)', fontSize: '1.5rem', marginBottom: 8 }}>
              Confirm Bulk Import
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(31,36,33,0.7)', marginBottom: 24, lineHeight: 1.5 }}>
              You are about to import <strong>{confirmData.count} member records</strong>.<br/><br/>
              Members with an existing National ID or phone number will be safely skipped, not overwritten.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button 
                onClick={() => setConfirmData(null)} 
                style={{ padding: '10px 24px', borderRadius: 4, border: '1px solid var(--color-line)', background: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeImport} 
                className="admin-btn admin-btn--approve" 
                style={{ padding: '10px 24px', fontSize: '0.9rem' }}
              >
                Yes, Import {confirmData.count} Members
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}

export default DataImport;