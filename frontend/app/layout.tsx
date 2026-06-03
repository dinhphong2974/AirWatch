import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Air Watch — Air Quality Monitor',
  description: 'Real-time air quality monitoring dashboard powered by STM32 + ESP32 LoRa sensor network.',
  keywords: ['air quality', 'PM2.5', 'AQI', 'IoT', 'LoRa', 'STM32', 'ESP32'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='28'>🌬️</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
