import React, { useState, useEffect } from 'react';

// A spinner that, after a delay, admits it's taking a while and explains
// why - most likely Render's free-tier service waking up from sleep after
// inactivity, or a slow connection. Silence past a few seconds reads as
// broken; this keeps the person informed instead of just spinning forever.
function LoadingState({ label = 'Loading…', slowAfterMs = 6000 }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(t);
  }, [slowAfterMs]);

  return (
    <div style={{ textAlign: 'center', padding: '56px 0' }}>
      <div className="admin-spinner" style={{ margin: '0 auto 14px' }} />
      <div style={{ color: 'rgba(31,36,33,0.55)', fontSize: '0.9rem' }}>{label}</div>
      {slow && (
        <div style={{ color: 'rgba(31,36,33,0.4)', fontSize: '0.8rem', marginTop: 10, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          This is taking longer than usual. If this is the first load in a while, the server may be waking up from sleep — it can take up to a minute. Otherwise, check your connection.
        </div>
      )}
    </div>
  );
}

// Turns a raw fetch/network error into something a person can actually act
// on, instead of a technical "Failed to fetch" they can't interpret.
export function friendlyErrorMessage(err) {
  if (err instanceof TypeError || err.message === 'Failed to fetch') {
    return 'Could not connect to the server. Check your internet connection and try again — if this is the first load in a while, the server may just be waking up.';
  }
  return err.message;
}

export default LoadingState;
