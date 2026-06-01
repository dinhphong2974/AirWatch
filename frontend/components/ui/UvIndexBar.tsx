'use client';

import { getUvColor, getUvCategory } from '@/lib/aqi';

interface Props { uv: number | null; }

export default function UvIndexBar({ uv }: Props) {
  const pct = uv !== null ? Math.min(100, (uv / 11) * 100) : 0;
  const color = uv !== null ? getUvColor(uv) : 'var(--text-muted)';
  const category = uv !== null ? getUvCategory(uv) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>UV Index</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{category}</span>
      </div>
      <div className="uv-bar-track">
        <div
          className="uv-bar-thumb"
          style={{ left: `${pct}%`, transition: 'left 800ms ease' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'var(--text-muted)' }}>
        <span>Low</span><span>Moderate</span><span>High</span><span>V.High</span><span>Extreme</span>
      </div>
    </div>
  );
}
