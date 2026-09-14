import React from 'react';

// Dot-grid pattern rendered as a CSS radial-gradient, positioned in two
// corners - echoes the Daraja developer portal's decorative background
// without needing an image asset or SVG file.
const dotGridStyle = {
  backgroundImage: 'radial-gradient(circle, var(--color-forest) 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
  opacity: 0.35,
};

function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-paper)', fontFamily: 'var(--font-body)',
    }}>
      {/* Soft green blobs, top-right and bottom-left, matching the Daraja layout */}
      <div style={{
        position: 'absolute', top: -120, right: -120, width: 420, height: 420,
        borderRadius: '50%', background: 'var(--color-gold-soft)', opacity: 0.35, filter: 'blur(10px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -140, left: -140, width: 420, height: 420,
        borderRadius: '50%', background: 'var(--color-sage)', opacity: 0.5, filter: 'blur(10px)',
      }} />

      {/* Dot grids, top-right and bottom-left corners */}
      <div style={{ position: 'absolute', top: 40, right: 60, width: 160, height: 80, ...dotGridStyle }} />
      <div style={{ position: 'absolute', bottom: 40, left: 60, width: 160, height: 80, ...dotGridStyle }} />

      <div style={{
        position: 'relative', zIndex: 1, background: '#fff', borderRadius: 12,
        boxShadow: '0 8px 32px rgba(15,42,30,0.10)', padding: '40px 36px',
        width: 400, maxWidth: '90vw',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {eyebrow && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-gold)', marginBottom: 8 }}>
              {eyebrow}
            </div>
          )}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 700, color: 'var(--color-forest-deep)', margin: 0 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ color: 'rgba(31,36,33,0.6)', fontSize: '0.92rem', marginTop: 6 }}>{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
