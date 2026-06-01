'use client';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ForecastPanel from '@/components/dashboard/ForecastPanel';
import Pm25TimeChart from '@/components/charts/Pm25TimeChart';
import useSWR from 'swr';
import type { HistoryResponse } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ForecastPage() {
  const { data } = useSWR<HistoryResponse>(
    '/api/history?limit=100', fetcher, { revalidateOnFocus: false }
  );

  return (
    <div className="app-layout">
      <Header />
      <Sidebar />
      <main className="app-main" id="forecast-content">

        {/* Page heading */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>AI Forecast</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>
            LSTM + Random Forest hybrid — PM2.5 short-term prediction
          </p>
        </div>

        {/* How it works */}
        <div className="chart-card" style={{ marginBottom: 0 }}>
          <div className="chart-title">
            <div className="chart-title-dot" style={{ background: '#60A5FA' }} />
            How the model works
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
            {[
              {
                step: '①', title: 'Data Collection',
                desc: 'ESP32 sends readings every ~30s. At least 48 readings needed to train (≈24 min).',
                color: '#60A5FA',
              },
              {
                step: '②', title: 'LSTM Trend Model',
                desc: 'Learns temporal patterns from a 24-step sliding window. Captures long-term trend.',
                color: '#A78BFA',
              },
              {
                step: '③', title: 'Random Forest Correction',
                desc: 'Corrects LSTM residuals using lag features + time-of-day signals.',
                color: '#34D399',
              },
              {
                step: '④', title: 'Forecast Output',
                desc: 'Returns next 3–24 steps with confidence band. Re-train any time for fresh model.',
                color: '#FBBF24',
              },
            ].map(({ step, title, desc, color }) => (
              <div key={step} style={{
                padding: 'var(--space-md)', background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)',
              }}>
                <div style={{ fontSize: '1.25rem', marginBottom: 6, color }}>{step}</div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Data requirement callout */}
          <div style={{
            marginTop: 'var(--space-md)', padding: 'var(--space-md)',
            background: 'rgba(167,139,250,0.08)', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(167,139,250,0.2)',
            fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6,
          }}>
            <strong style={{ color: '#A78BFA' }}>📊 Data requirements:</strong>
            {' '}Minimum <strong>48 readings</strong> (~24 min at 30s interval) to train.
            Recommended <strong>288+ readings</strong> (≈2.4 hours) for good accuracy.
            With 30s sensor interval the model predicts up to{' '}
            <strong>12 minutes ahead</strong> (24 steps × 30s).
            For best results, leave the sensor running overnight and retrain in the morning.
          </div>
        </div>

        {/* Historical chart for context */}
        {data && data.data.length > 1 && (
          <Pm25TimeChart data={data.data} />
        )}

        {/* The actual forecast panel */}
        <ForecastPanel />

      </main>
    </div>
  );
}
