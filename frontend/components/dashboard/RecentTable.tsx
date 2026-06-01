import type { SensorReading } from '@/lib/types';
import { getAqiInfo } from '@/lib/aqi';

interface Props { readings: SensorReading[]; }

export default function RecentTable({ readings }: Props) {
  if (!readings.length) {
    return (
      <div className="table-card">
        <div className="table-header-row">
          <span className="table-title">Recent Readings</span>
        </div>
        <p style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-header-row">
        <span className="table-title">Recent Readings</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Last {readings.length} entries
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>PM2.5 (µg/m³)</th>
              <th>Temp (°C)</th>
              <th>Hum (%)</th>
              <th>Pres (hPa)</th>
              <th>UV</th>
              <th>AQI</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => {
              const info = getAqiInfo(r.aqi);
              return (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'inherit' }}>{r.sensor_date}</td>
                  <td>{r.sensor_time}</td>
                  <td>{r.pm25.toFixed(1)}</td>
                  <td>{r.temperature.toFixed(1)}</td>
                  <td>{r.humidity.toFixed(1)}</td>
                  <td>{r.pressure.toFixed(1)}</td>
                  <td>{r.uv.toFixed(2)}</td>
                  <td style={{ color: info.color, fontWeight: 700 }}>{r.aqi}</td>
                  <td>
                    <span
                      className="aqi-chip"
                      style={{ background: info.bgColor, color: info.color, border: `1px solid ${info.color}40` }}
                    >
                      {info.level}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
