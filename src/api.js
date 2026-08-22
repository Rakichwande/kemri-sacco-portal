// Points at your local backend by default. Change VITE_API_URL in a .env
// file when this gets deployed (e.g. to your Render URL later).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    // Backend returns either { error } or { errors: [...] } depending on
    // whether it's a validation failure or a general error
    const message = data.errors ? data.errors.join(', ') : data.error || 'Something went wrong';
    throw new Error(message);
  }

  return data;
}

export function registerMember(payload) {
  return request('/api/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function initiatePayment(payload) {
  return request('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkPaymentStatus(checkoutRequestId) {
  return request(`/api/payments/status/${checkoutRequestId}`);
}
