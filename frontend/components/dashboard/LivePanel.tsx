'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getAqiInfoFromPm25, getTemperatureAlert, getHumidityAlert, getPressureAlert, getUvAlert, formatTrend } from '@/lib/aqi';
import type { LatestResponse } from '@/lib/types';
import AqiGauge from '@/components/ui/AqiGauge';
import MetricCard from '@/components/ui/MetricCard';
import AlertBanner from '@/components/ui/AlertBanner';
import StatusBadge from '@/components/ui/StatusBadge';
import UvIndexBar from '@/components/ui/UvIndexBar';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const POLL_INTERVAL = 3_000; // 3 seconds — quick updates for live dashboard
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes = offline

export default function LivePanel() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<LatestResponse>(
    '/api/latest',
    fetcher,
    { refreshInterval: POLL_INTERVAL, revalidateOnFocus: true }
  );

  useEffect(() => {
    if (data?.id) {
      router.refresh();
    }
  }, [data?.id, router]);

  const isLive = data?.received_at
    ? Date.now() - new Date(data.received_at).getTime() < STALE_THRESHOLD_MS
    : false;

  const aqiInfo = data ? getAqiInfoFromPm25(data.pm25) : null;
  const showAlert = aqiInfo && aqiInfo.aqi > 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

      {/* Status Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Live Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>
            Sensor Node 1 — STM32 · LoRa 433MHz
          </p>
        </div>
        <StatusBadge isLive={isLive} lastUpdated={data?.received_at ?? null} />
      </div>

      {/* Alert Banner */}
      {showAlert && aqiInfo && (
        <AlertBanner
          level={aqiInfo.level}
          color={aqiInfo.color}
          bgColor={aqiInfo.bgColor}
          message={aqiInfo.message}
          action={aqiInfo.action}
        />
      )}

      {/* AQI Gauge + Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-md)', alignItems: 'start' }}>
        <AqiGauge aqiInfo={aqiInfo} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="metrics-grid">
            <MetricCard
              label="PM2.5"
              value={data?.pm25 ?? null}
              unit="µg/m³"
              icon="💨"
              decimals={1}
              accentColor={aqiInfo?.color}
            />
            <MetricCard
              label="Temperature"
              value={data?.temperature ?? null}
              unit="°C"
              icon="🌡️"
              decimals={1}
              alertLevel={data ? getTemperatureAlert(data.temperature).level : 'normal'}
              accentColor={data ? getTemperatureAlert(data.temperature).color : undefined}
            />
            <MetricCard
              label="Humidity"
              value={data?.humidity ?? null}
              unit="%"
              icon="💧"
              decimals={1}
              alertLevel={data ? getHumidityAlert(data.humidity).level : 'normal'}
              accentColor={data ? getHumidityAlert(data.humidity).color : undefined}
            />
            <MetricCard
              label="Pressure"
              value={data?.pressure ?? null}
              unit="hPa"
              icon="📊"
              decimals={1}
              alertLevel={data ? getPressureAlert(data.pressure).level : 'normal'}
              accentColor={data ? getPressureAlert(data.pressure).color : undefined}
            />
          </div>

          {/* UV Index Bar */}
          <div className="chart-card" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>UV INDEX</span>
              <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {data?.uv?.toFixed(2) ?? '—'}
              </span>
            </div>
            <UvIndexBar uv={data?.uv ?? null} />
          </div>

          {/* Sensor Timestamp */}
          {data && (
            <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '0 4px' }}>
              <span>📅 {data.sensor_date}</span>
              <span className="mono">⏰ {data.sensor_time}</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading / Error states */}
      {isLoading && !data && (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          ⏳ Waiting for first sensor reading...
        </div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: '#F87171', fontSize: '0.875rem' }}>
          ⚠️ Failed to fetch data. Retrying in 30s...
        </div>
      )}
    </div>
  );
}
