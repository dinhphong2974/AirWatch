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
            Multi-Output RandomForest Regression + Classification Forecast
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
                step: '①', title: 'Data Loading',
                desc: 'Loads historical dataset containing 23k+ balanced records combined with active sensor readings.',
                color: '#60A5FA',
              },
              {
                step: '②', title: 'Multi-Output Regressor',
                desc: 'Simultaneously forecasts 5 metrics: PM2.5, Temperature, Humidity, Pressure, and UV index.',
                color: '#A78BFA',
              },
              {
                step: '③', title: 'Weather Classifier',
                desc: 'Predicts the weather label (normal, rainy, sunny) along with classification confidence.',
                color: '#34D399',
              },
              {
                step: '④', title: 'Autoregressive Roll',
                desc: 'Uses a 12-step sliding window to forecast future values step-by-step.',
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
            <strong style={{ color: '#A78BFA' }}>📊 Model requirements & Performance:</strong>
            {' '}Trained from a balanced CSV with <strong>23,576 rows</strong>.
            Achieves a classifier in-sample accuracy of <strong>99.59%</strong>.
            Uses a sliding window of the last <strong>12 sensor readings</strong> (approx. 1 hour) to initialize forecasts.
            Predicts up to <strong>24 steps ahead</strong> dynamically using an autoregressive loop.
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
