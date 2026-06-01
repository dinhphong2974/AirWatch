'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Pm25TimeChart from '@/components/charts/Pm25TimeChart';
import TempHumidityChart from '@/components/charts/TempHumidityChart';
import RecentTable from '@/components/dashboard/RecentTable';
import SummaryRow from '@/components/dashboard/SummaryRow';
import type { HistoryResponse } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toISODate(s: string, isEnd = false) {
  // Parse YYYY-MM-DD directly to avoid timezone shift.
  // new Date('YYYY-MM-DD') treats it as UTC midnight — in UTC+7 that becomes
  // the previous day at 17:00 local, which breaks date filters.
  if (!s) return '';
  // Append time component: 00:00:00 for "from", 23:59:59 for "to"
  return `${s}T${isEnd ? '23:59:59' : '00:00:00'}.000Z`;
}

function exportCsv(data: HistoryResponse['data']) {
  const header = 'Date,Time,PM2.5,Temperature,Humidity,Pressure,UV,AQI,Level\n';
  const rows = data.map((r) =>
    `${r.sensor_date},${r.sensor_time},${r.pm25},${r.temperature},${r.humidity},${r.pressure},${r.uv},${r.aqi},${r.aqi_level}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aqi_history_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function HistoryPage() {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');
  const [limit, setLimit] = useState(200);

  const params = new URLSearchParams({ limit: String(limit) });
  if (from) params.set('from', toISODate(from));
  if (to)   params.set('to',   toISODate(to, true));

  const { data, isLoading } = useSWR<HistoryResponse>(
    `/api/history?${params}`, fetcher, { revalidateOnFocus: false }
  );

  return (
    <div className="app-layout">
      <Header />
      <Sidebar />
      <main className="app-main" id="history-content">

        {/* Page heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>History</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>
              {data ? `${data.total} total readings` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => data && exportCsv(data.data)}
            disabled={!data?.data.length}
            style={{
              padding: '8px 16px',
              background: 'hsla(207,100%,56%,0.12)',
              border: '1px solid hsla(207,100%,56%,0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-blue)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⬇ Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.8125rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.8125rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Rows</label>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.8125rem' }}
            >
              <option value={50}>50</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem' }}>
              ✕ Clear filters
            </button>
          )}
        </div>

        {isLoading && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: 'var(--space-xl)' }}>Loading...</p>
        )}

        {data && data.data.length > 1 && (
          <>
            <Pm25TimeChart data={data.data} />
            <TempHumidityChart data={data.data} />
            <SummaryRow summary={data.summary} />
            <RecentTable readings={data.data} />
          </>
        )}

        {data && data.data.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: 'var(--space-2xl)' }}>
            No readings found for the selected period.
          </p>
        )}
      </main>
    </div>
  );
}
