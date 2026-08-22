import { useState } from 'react';
import { registerMember } from '../api';
import Payment from './Payment';

const initialForm = {
  full_name: '',
  id_number: '',
  phone_number: '',
  nationality: 'Kenyan',
  age: '',
  physical_address: '',
  beneficiary_email: '',
  employer: '',
  date_of_employment: '',
  employment_status: '',
  monthly_contribution: '',
  contribution_start_month: '',
};

const EMPLOYMENT_STATUSES = ['Temporary', 'Contract', 'Permanent', 'Permanent and Pensionable'];

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    try {
      const member = await registerMember({
        ...form,
        age: form.age ? Number(form.age) : undefined,
        monthly_contribution: form.monthly_contribution ? Number(form.monthly_contribution) : undefined,
      });
      setResult(member);
    } catch (err) {
      setErrors(err.message.split(', '));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <Payment member={result} />;
  }

  return (
    <>
      <p className="page-eyebrow">Holiday Savings Scheme</p>
      <h1 className="page-title">Apply for membership</h1>
      <p className="page-lede">
        Fill in your details below. Once submitted, your application goes to the SACCO board for
        review, and you'll receive an SMS confirmation with next steps.
      </p>

      <div className="card">
        {errors.length > 0 && (
          <div className="error-banner" role="alert">
            <strong>Please fix the following:</strong>
            <ul>
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              type="text"
              value={form.full_name}
              onChange={update('full_name')}
              placeholder="As it appears on your ID"
              required
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="id_number">ID number</label>
              <input
                id="id_number"
                type="text"
                inputMode="numeric"
                value={form.id_number}
                onChange={update('id_number')}
                placeholder="12345678"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                min="18"
                max="120"
                value={form.age}
                onChange={update('age')}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="nationality">Nationality</label>
            <input id="nationality" type="text" value={form.nationality} onChange={update('nationality')} required />
          </div>

          <div className="field">
            <label htmlFor="phone_number">Phone number</label>
            <input
              id="phone_number"
              type="tel"
              value={form.phone_number}
              onChange={update('phone_number')}
              placeholder="0712 345 678"
              required
            />
            <p className="hint">This is where your M-Pesa payment prompts and SMS confirmations will go.</p>
          </div>

          <div className="field">
            <label htmlFor="physical_address">Physical address</label>
            <input
              id="physical_address"
              type="text"
              value={form.physical_address}
              onChange={update('physical_address')}
              placeholder="e.g. P.O. Box, estate, town"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="beneficiary_email">Beneficiary email (optional)</label>
            <input
              id="beneficiary_email"
              type="email"
              value={form.beneficiary_email}
              onChange={update('beneficiary_email')}
            />
          </div>

          <div className="field">
            <label htmlFor="employer">Employer (optional)</label>
            <input id="employer" type="text" value={form.employer} onChange={update('employer')} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="date_of_employment">Date of employment (optional)</label>
              <input
                id="date_of_employment"
                type="date"
                value={form.date_of_employment}
                onChange={update('date_of_employment')}
              />
            </div>
            <div className="field">
              <label htmlFor="employment_status">Employment status</label>
              <select id="employment_status" value={form.employment_status} onChange={update('employment_status')}>
                <option value="">Select…</option>
                {EMPLOYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="monthly_contribution">Monthly contribution (KES)</label>
              <input
                id="monthly_contribution"
                type="number"
                min="1"
                value={form.monthly_contribution}
                onChange={update('monthly_contribution')}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="contribution_start_month">Starting month</label>
              <input
                id="contribution_start_month"
                type="month"
                value={form.contribution_start_month}
                onChange={update('contribution_start_month')}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </>
  );
}