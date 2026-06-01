'use client';

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend
} from 'recharts';
import type { SensorReading } from '@/lib/types';

interface Props { data: SensorReading[]; }

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.8125rem',
    }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#1CB5FF', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
        PM2.5: {payload[0]?.value?.toFixed(1)} µg/m³
      </p>
    </div>
  );
};

export default function Pm25TimeChart({ data }: Props) {
  const chartData = [...data].reverse().map((r) => ({
    time: r.sensor_time?.substring(0, 5) ?? '',
    pm25: r.pm25,
  }));

  return (
    <div className="chart-card">
      <div className="chart-title">
        <div className="chart-title-dot" style={{ background: '#1CB5FF' }} />
        PM2.5 Concentration — Last 24 Hours
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="pm25Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1CB5FF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1CB5FF" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsla(210,30%,60%,0.06)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" µg" />
          <Tooltip content={<CUSTOM_TOOLTIP />} />
          {/* Threshold reference lines */}
          <ReferenceLine y={12}    stroke="#FFFF00" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Moderate', fill: '#FFFF00', fontSize: 10, position: 'insideTopRight' }} />
          <ReferenceLine y={35.4}  stroke="#FF7E00" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Sensitive', fill: '#FF7E00', fontSize: 10, position: 'insideTopRight' }} />
          <ReferenceLine y={55.4}  stroke="#FF0000" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Unhealthy', fill: '#FF0000', fontSize: 10, position: 'insideTopRight' }} />
          <Area type="monotone" dataKey="pm25" fill="url(#pm25Grad)" stroke="none" />
          <Line type="monotone" dataKey="pm25" stroke="#1CB5FF" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#1CB5FF', stroke: 'var(--bg-base)', strokeWidth: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
