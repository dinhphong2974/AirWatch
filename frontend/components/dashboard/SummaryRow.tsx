import type { HistoryResponse } from '@/lib/types';

interface Props { summary: HistoryResponse['summary'] | null; }

const METRICS = [
  { key: 'pm25',        label: 'PM2.5',      unit: 'µg/m³', decimals: 1 },
  { key: 'temperature', label: 'Temperature', unit: '°C',    decimals: 1 },
  { key: 'humidity',    label: 'Humidity',    unit: '%',     decimals: 1 },
  { key: 'pressure',    label: 'Pressure',    unit: 'hPa',   decimals: 1 },
  { key: 'uv',          label: 'UV Index',    unit: '',      decimals: 2 },
] as const;

export default function SummaryRow({ summary }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
        24-Hour Summary
      </h3>
      <div className="summary-row">
        {METRICS.map(({ key, label, unit, decimals }) => {
          const s = summary?.[key];
          return (
            <div key={key} className="summary-stat">
              <div className="summary-label">{label}</div>
              <div className="summary-values">
                {(['min', 'max', 'avg'] as const).map((stat) => (
                  <div key={stat} className="summary-item">
                    <span className="summary-item-label">{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                    <span className="summary-item-value">
                      {s && s[stat] !== null
                        ? `${(s[stat] as number).toFixed(decimals)}${unit ? ` ${unit}` : ''}`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
