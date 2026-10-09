import React from 'react';

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

// Three-series grouped-bar chart for Financial Trends: Loans vs Repayments
// vs Interest, one group per month. Replaces the three MiniTrend charts
// that used to sit side-by-side (each had its own scale, so cross-series
// comparison was impossible).
//
// Shared scale = max value across all three series in all months. The
// interest bar is genuinely small relative to loan principal (6% for a
// 1-month loan), so it will look short — that's honest, and it shows the
// board the real ratio of profit to volume. Tooltips on each bar give the
// exact number.
function CombinedTrend({ data }) {
  const allValues = data.flatMap((d) => [d.loans || 0, d.repayments || 0, d.interest || 0]);
  const max = Math.max(...allValues, 1);
  const chartHeight = 140;

  const legend = [
    { color: '#55308a', label: 'Loans Disbursed' },
    { color: 'var(--color-gold)', label: 'Repayments' },
    { color: 'var(--color-forest)', label: 'Interest Earned' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: '0.78rem', flexWrap: 'wrap' }}>
        {legend.map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, background: l.color, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ color: 'rgba(31,36,33,0.75)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: chartHeight + 30 }}>
        {data.map((d) => {
          const loansH = Math.max((d.loans / max) * chartHeight, d.loans > 0 ? 4 : 2);
          const repayH = Math.max((d.repayments / max) * chartHeight, d.repayments > 0 ? 4 : 2);
          const interestH = Math.max((d.interest / max) * chartHeight, d.interest > 0 ? 4 : 2);

          return (
            <div key={d.label} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6, minWidth: 0,
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 3,
                width: '100%', justifyContent: 'center',
              }}>
                <div
                  title={`Loans: ${formatKES(d.loans)}`}
                  style={{
                    width: 12, height: loansH, background: '#55308a',
                    borderRadius: '3px 3px 0 0', cursor: 'help',
                  }}
                />
                <div
                  title={`Repayments: ${formatKES(d.repayments)}`}
                  style={{
                    width: 12, height: repayH, background: 'var(--color-gold)',
                    borderRadius: '3px 3px 0 0', cursor: 'help',
                  }}
                />
                <div
                  title={`Interest: ${formatKES(d.interest)}`}
                  style={{
                    width: 12, height: interestH, background: 'var(--color-forest)',
                    borderRadius: '3px 3px 0 0', cursor: 'help',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(31,36,33,0.5)' }}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        fontSize: '0.72rem', color: 'rgba(31,36,33,0.5)',
        marginTop: 14, textAlign: 'center',
      }}>
        Hover any bar for the exact figure. Interest bars are ~6% of loan volume by design (1-month loan, 6% flat rate).
      </div>
    </div>
  );
}

export default CombinedTrend;