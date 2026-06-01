'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PredPoint {
  step: number;
  pm25_predicted: number;
  pm25_lower: number;
  pm25_upper: number;
  temperature_predicted: number;
  humidity_predicted: number;
  pressure_predicted: number;
  uv_predicted: number;
  aqi_predicted: number;
  aqi_level: string;
  weather_label: string;
  weather_confidence: number;
  weather_proba?: Record<string, number>;
}

interface PredictResponse {
  predictions: PredPoint[];
  method: 'rf_multioutput' | 'ema_fallback' | 'unavailable';
  steps: number;
  interval_seconds: number;
  trained_at: string | null;
  csv_rows_used: number;
  live_db_rows: number;
  data_source: string;
  note: string | null;
  error?: string;
}

interface ModelStatus {
  trained: boolean;
  trained_at: string | null;
  csv_rows: number;
  live_db_rows: number;
  classifier_accuracy: number | null;
  window_size: number;
  forecast_horizon: number;
  last_error: string | null;
  training_in_progress: boolean;
  supported_outputs: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AQI_COLORS: Record<string, string> = {
  'Good': '#00E400',
  'Moderate': '#FFFF00',
  'Unhealthy for Sensitive Groups': '#FF7E00',
  'Unhealthy': '#FF0000',
  'Very Unhealthy': '#8F3F97',
  'Hazardous': '#7E0023',
};

const WEATHER_ICONS: Record<string, string> = {
  normal: '🌤',
  sunny: '☀️',
  rainy: '🌧',
};

const WEATHER_COLORS: Record<string, string> = {
  normal: '#60A5FA',
  sunny: '#FBBF24',
  rainy: '#818CF8',
};

type MetricKey = 'pm25_predicted' | 'temperature_predicted' | 'humidity_predicted' | 'pressure_predicted' | 'uv_predicted';

const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: 'pm25_predicted',          label: 'PM2.5',  unit: 'µg/m³', color: '#A78BFA' },
  { key: 'temperature_predicted',   label: 'Temp',   unit: '°C',    color: '#F87171' },
  { key: 'humidity_predicted',      label: 'Humid',  unit: '%',     color: '#34D399' },
  { key: 'pressure_predicted',      label: 'Pres',   unit: 'hPa',   color: '#60A5FA' },
  { key: 'uv_predicted',            label: 'UV',     unit: '',      color: '#FBBF24' },
];

const fetcher = (url: string) => fetch(url).then(r => r.json());
const STEPS_DEFAULT = 6;
const POLL_INTERVAL = 60_000;

// ── Tooltip ───────────────────────────────────────────────────────────────────
const ForecastTooltip = ({ active, payload, intervalSec, activeMetric }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PredPoint;
  if (!d) return null;
  const minutesAhead = Math.round((d.step * intervalSec) / 60);
  const metric = METRICS.find(m => m.key === activeMetric) ?? METRICS[0];
  const val = d[activeMetric as MetricKey];

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.8125rem',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
        +{minutesAhead} min ahead (step {d.step})
      </p>
      <p style={{ color: metric.color, fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
        {metric.label}: {typeof val === 'number' ? val.toFixed(metric.key === 'pressure_predicted' ? 1 : 2) : '—'} {metric.unit}
      </p>
      {activeMetric === 'pm25_predicted' && (
        <>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            Range: {d.pm25_lower.toFixed(1)} – {d.pm25_upper.toFixed(1)} µg/m³
          </p>
          <p style={{ color: AQI_COLORS[d.aqi_level] ?? '#ccc', fontWeight: 600, marginTop: 4 }}>
            AQI {d.aqi_predicted} · {d.aqi_level}
          </p>
        </>
      )}
      <p style={{ marginTop: 6, fontSize: '0.75rem', color: WEATHER_COLORS[d.weather_label] ?? '#aaa' }}>
        {WEATHER_ICONS[d.weather_label] ?? '?'} {d.weather_label}
        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
          ({(d.weather_confidence * 100).toFixed(0)}%)
        </span>
      </p>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ForecastPanel() {
  const [steps, setSteps] = useState(STEPS_DEFAULT);
  const [isTraining, setIsTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('pm25_predicted');

  const { data: statusData, mutate: mutateStatus } = useSWR<ModelStatus>(
    '/api/ai-status', fetcher, { refreshInterval: 30_000 }
  );

  const { data: predData, isLoading, mutate: mutatePred } = useSWR<PredictResponse>(
    `/api/predict?steps=${steps}`, fetcher, { refreshInterval: POLL_INTERVAL }
  );

  const intervalSec = predData?.interval_seconds ?? 30;
  const method = predData?.method;
  const isRF = method === 'rf_multioutput';
  const isUnavailable = method === 'unavailable' || !predData || (predData as any).error;
  const predictions = predData?.predictions ?? [];

  const chartData = predictions.map(p => ({
    ...p,
    label: `+${Math.round((p.step * intervalSec) / 60)}m`,
  }));

  const activeMetricMeta = METRICS.find(m => m.key === activeMetric)!;

  const handleTrain = async () => {
    setIsTraining(true);
    setTrainMsg(null);
    try {
      const res = await fetch('/api/ai-status', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setTrainMsg(`✅ ${json.message ?? 'Training started'} (ETA ~${json.eta_seconds}s)`);
        setTimeout(() => {
          mutateStatus();
          mutatePred();
          setTrainMsg(null);
        }, (json.eta_seconds ?? 60) * 1000 + 3000);
      } else {
        setTrainMsg(`❌ ${json.detail ?? json.error ?? 'Training failed'}`);
      }
    } catch {
      setTrainMsg('❌ AI service offline');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="chart-card" style={{ position: 'relative' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <div className="chart-title" style={{ marginBottom: 0 }}>
          <div className="chart-title-dot" style={{ background: '#A78BFA' }} />
          AI Forecast
          <span style={{
            marginLeft: 8, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
            padding: '2px 8px', borderRadius: 99,
            background: isRF ? 'rgba(167,139,250,0.15)' : 'rgba(251,191,36,0.12)',
            color: isRF ? '#A78BFA' : '#FBBF24',
            border: `1px solid ${isRF ? '#A78BFA40' : '#FBBF2440'}`,
          }}>
            {isRF ? 'RF Model' : isUnavailable ? 'OFFLINE' : 'EMA'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={steps}
            onChange={e => setSteps(Number(e.target.value))}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
              padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            {[3, 6, 12, 24].map(n => (
              <option key={n} value={n}>
                +{Math.round((n * intervalSec) / 60)}min ({n} steps)
              </option>
            ))}
          </select>

          <button
            onClick={handleTrain}
            disabled={isTraining}
            style={{
              padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              background: 'rgba(167,139,250,0.12)', color: '#A78BFA',
              border: '1px solid rgba(167,139,250,0.3)', borderRadius: 'var(--radius-sm)',
              opacity: isTraining ? 0.6 : 1, transition: 'opacity 200ms',
            }}
          >
            {isTraining ? '⏳ Training…' : '🔁 (Re)Train'}
          </button>
        </div>
      </div>

      {/* ── Train message ── */}
      {trainMsg && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
          {trainMsg}
        </p>
      )}

      {/* ── Status bar ── */}
      <div style={{
        display: 'flex', gap: 'var(--space-lg)', fontSize: '0.7rem',
        color: 'var(--text-muted)', marginBottom: 'var(--space-md)', flexWrap: 'wrap',
      }}>
        <span>
          📊 CSV: <strong style={{ color: 'var(--text-secondary)' }}>{statusData?.csv_rows?.toLocaleString() ?? '—'} rows</strong>
        </span>
        <span>
          📡 Live: <strong style={{ color: 'var(--text-secondary)' }}>{statusData?.live_db_rows ?? predData?.live_db_rows ?? '—'} readings</strong>
        </span>
        {statusData?.classifier_accuracy != null && (
          <span>
            🎯 Acc: <strong style={{ color: '#34D399' }}>{(statusData.classifier_accuracy * 100).toFixed(1)}%</strong>
          </span>
        )}
        {statusData?.trained && statusData.trained_at && (
          <span>
            🕐 Trained: <strong style={{ color: 'var(--text-secondary)' }}>
              {new Date(statusData.trained_at).toLocaleTimeString('en-GB')}
            </strong>
          </span>
        )}
        {statusData?.training_in_progress && (
          <span style={{ color: '#FBBF24' }}>⏳ Training in progress…</span>
        )}
        {predData?.note && !isRF && (
          <span style={{ color: '#FBBF24' }}>⚠ {predData.note}</span>
        )}
      </div>

      {/* ── Metric selector tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setActiveMetric(m.key)}
            style={{
              padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
              borderRadius: 99, transition: 'all 150ms',
              background: activeMetric === m.key ? `${m.color}22` : 'transparent',
              color: activeMetric === m.key ? m.color : 'var(--text-muted)',
              border: `1px solid ${activeMetric === m.key ? m.color + '55' : 'var(--glass-border)'}`,
            }}
          >
            {m.label} {m.unit && <span style={{ opacity: 0.6 }}>{m.unit}</span>}
          </button>
        ))}
      </div>

      {/* ── Loading / Offline states ── */}
      {isLoading && !predData && (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          ⏳ Loading forecast...
        </div>
      )}
      {isUnavailable && !isLoading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: '#F87171', fontSize: '0.875rem' }}>
          ⚠️ AI service offline — start with <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>uvicorn main:app</code>
        </div>
      )}

      {/* ── Chart ── */}
      {predictions.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeMetricMeta.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={activeMetricMeta.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsla(210,30%,60%,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                unit={activeMetricMeta.unit ? ` ${activeMetricMeta.unit.replace('µg/m³', 'µg')}` : ''}
              />
              <Tooltip content={<ForecastTooltip intervalSec={intervalSec} activeMetric={activeMetric} />} />

              {/* PM2.5 threshold lines only when viewing PM2.5 */}
              {activeMetric === 'pm25_predicted' && (
                <>
                  <ReferenceLine y={12}   stroke="#FFFF00" strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine y={35.4} stroke="#FF7E00" strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine y={55.4} stroke="#FF0000" strokeDasharray="4 4" strokeWidth={1} />
                  {/* Confidence band */}
                  <Area type="monotone" dataKey="pm25_upper" fill={`url(#forecastGrad)`} stroke="none" />
                  <Area type="monotone" dataKey="pm25_lower" fill="var(--bg-base)" stroke="none" />
                </>
              )}

              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke={activeMetricMeta.color}
                strokeWidth={2}
                fill={activeMetric === 'pm25_predicted' ? 'none' : `url(#forecastGrad)`}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: activeMetricMeta.color, stroke: 'var(--bg-base)', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* ── Step cards: show all 5 metrics + weather ── */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginTop: 'var(--space-md)' }}>
            {predictions.map(p => {
              const wColor = WEATHER_COLORS[p.weather_label] ?? '#888';
              const wIcon  = WEATHER_ICONS[p.weather_label] ?? '?';
              const aqiColor = AQI_COLORS[p.aqi_level] ?? '#888';
              return (
                <div key={p.step} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: `${aqiColor}10`,
                  border: `1px solid ${aqiColor}25`,
                  minWidth: 68, gap: 2,
                }}>
                  {/* Time */}
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    +{Math.round((p.step * intervalSec) / 60)}m
                  </span>
                  {/* AQI */}
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.875rem', color: aqiColor }}>
                    {p.aqi_predicted}
                  </span>
                  {/* PM2.5 */}
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    {p.pm25_predicted.toFixed(1)} µg
                  </span>
                  {/* Temp / Hum */}
                  <span style={{ fontSize: '0.58rem', color: '#F87171' }}>
                    {p.temperature_predicted.toFixed(1)}°C
                  </span>
                  <span style={{ fontSize: '0.58rem', color: '#34D399' }}>
                    {p.humidity_predicted.toFixed(0)}%
                  </span>
                  {/* Weather label */}
                  <span style={{ fontSize: '0.62rem', color: wColor, marginTop: 2 }}>
                    {wIcon} {p.weather_label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
