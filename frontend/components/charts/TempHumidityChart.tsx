'use client';

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { SensorReading } from '@/lib/types';

interface Props { data: SensorReading[]; }

const TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.8125rem' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontFamily: 'JetBrains Mono', fontWeight: 600, marginBottom: 2 }}>
          {p.name}: {p.value?.toFixed(1)}{p.name === 'Temp' ? ' °C' : ' %'}
        </p>
      ))}
    </div>
  );
};

export default function TempHumidityChart({ data }: Props) {
  const chartData = [...data].reverse().map((r) => ({
    time: r.sensor_time?.substring(0, 5) ?? '',
    temp: r.temperature,
    humidity: r.humidity,
  }));

  return (
    <div className="chart-card">
      <div className="chart-title">
        <div className="chart-title-dot" style={{ background: '#F97316' }} />
        Temperature & Humidity — Last 24 Hours
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="hsla(210,30%,60%,0.06)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="temp" tick={{ fill: '#F97316', fontSize: 11 }} axisLine={false} tickLine={false} unit="°" domain={['auto', 'auto']} />
          <YAxis yAxisId="hum"  orientation="right" tick={{ fill: '#38BDF8', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip content={<TOOLTIP />} />
          <Legend
            wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingTop: 8 }}
            formatter={(v) => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>}
          />
          <Line yAxisId="temp" type="monotone" dataKey="temp"     name="Temp"     stroke="#F97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line yAxisId="hum"  type="monotone" dataKey="humidity" name="Humidity" stroke="#38BDF8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
