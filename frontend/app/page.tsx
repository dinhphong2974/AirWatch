import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import LivePanel from '@/components/dashboard/LivePanel';
import SummaryRow from '@/components/dashboard/SummaryRow';
import RecentTable from '@/components/dashboard/RecentTable';
import ForecastPanel from '@/components/dashboard/ForecastPanel';
import Pm25TimeChart from '@/components/charts/Pm25TimeChart';
import TempHumidityChart from '@/components/charts/TempHumidityChart';
import { getHistory } from '@/lib/db';
import type { HistoryResponse } from '@/lib/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Dashboard — AirWatch',
  description: 'Real-time air quality monitoring: PM2.5, temperature, humidity, pressure, UV index from STM32 + ESP32 LoRa sensor node.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  let historyData: HistoryResponse | null = null;
  try {
    historyData = getHistory({ limit: 100 });
  } catch {
    // DB may not exist yet on first load
  }

  return (
    <div className="app-layout">
      <Header />
      <Sidebar />
      <main className="app-main" id="main-content">
        <LivePanel />

        {historyData && historyData.data.length > 1 && (
          <>
            <Pm25TimeChart data={historyData.data} />
            <TempHumidityChart data={historyData.data} />
          </>
        )}

        {/* AI Forecast Panel — always shown, handles offline gracefully */}
        <ForecastPanel />

        <SummaryRow summary={historyData?.summary ?? null} />
        <RecentTable readings={historyData?.data.slice(0, 20) ?? []} />

        <footer style={{
          borderTop: '1px solid var(--glass-border)',
          paddingTop: 'var(--space-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
        }}>
          <span>AirWatch Dashboard v2 · STM32 + ESP32 LoRa System</span>
          <span>AQI Standard: US-EPA · Sensors: PMS7003, BME280, GUVA-S12SD</span>
        </footer>
      </main>
    </div>
  );
}
