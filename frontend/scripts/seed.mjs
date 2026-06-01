// Seed script — inserts demo data directly into SQLite (bypass HTTP)
// Run: node scripts/seed.mjs

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'aqi.db');

// PM2.5 to AQI (US-EPA)
function pm25ToAqi(pm25) {
  const bp = [
    [0.0, 12.0, 0, 50], [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150], [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300], [250.5, 500.4, 301, 500],
  ];
  const p = Math.round(pm25 * 10) / 10;
  for (const [cLo, cHi, iLo, iHi] of bp) {
    if (p >= cLo && p <= cHi)
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (p - cLo) + iLo);
  }
  return 500;
}

function aqiLevel(aqi) {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

const readings = [
  { pm25:  8.2, temperature: 24.5, humidity: 72.0, pressure: 1012.5, uv: 1.2, date: '01/06/2026', time: '06:00:00' },
  { pm25: 10.1, temperature: 25.1, humidity: 70.5, pressure: 1012.8, uv: 1.8, date: '01/06/2026', time: '06:30:00' },
  { pm25: 12.8, temperature: 25.8, humidity: 69.0, pressure: 1013.0, uv: 2.4, date: '01/06/2026', time: '07:00:00' },
  { pm25: 15.3, temperature: 26.2, humidity: 68.0, pressure: 1013.0, uv: 3.5, date: '01/06/2026', time: '07:30:00' },
  { pm25: 22.7, temperature: 27.5, humidity: 65.2, pressure: 1013.2, uv: 5.2, date: '01/06/2026', time: '08:00:00' },
  { pm25: 28.4, temperature: 28.3, humidity: 63.0, pressure: 1013.4, uv: 6.1, date: '01/06/2026', time: '08:30:00' },
  { pm25: 31.4, temperature: 28.8, humidity: 62.0, pressure: 1013.5, uv: 7.1, date: '01/06/2026', time: '09:00:00' },
  { pm25: 38.9, temperature: 30.1, humidity: 58.5, pressure: 1013.8, uv: 8.3, date: '01/06/2026', time: '09:30:00' },
  { pm25: 45.2, temperature: 31.2, humidity: 55.0, pressure: 1014.0, uv: 9.1, date: '01/06/2026', time: '10:00:00' },
  { pm25: 52.1, temperature: 31.8, humidity: 53.5, pressure: 1014.2, uv: 9.8, date: '01/06/2026', time: '10:30:00' },
  { pm25: 58.4, temperature: 32.3, humidity: 51.0, pressure: 1014.1, uv:10.2, date: '01/06/2026', time: '11:00:00' },
  { pm25: 42.3, temperature: 32.1, humidity: 52.0, pressure: 1013.9, uv: 9.5, date: '01/06/2026', time: '11:30:00' },
  { pm25: 35.1, temperature: 31.5, humidity: 54.0, pressure: 1013.5, uv: 8.8, date: '01/06/2026', time: '12:00:00' },
  { pm25: 28.4, temperature: 30.8, humidity: 57.0, pressure: 1013.2, uv: 7.5, date: '01/06/2026', time: '12:30:00' },
  { pm25: 24.6, temperature: 30.2, humidity: 59.5, pressure: 1013.0, uv: 6.2, date: '01/06/2026', time: '13:00:00' },
  { pm25: 19.8, temperature: 29.5, humidity: 62.0, pressure: 1012.8, uv: 5.0, date: '01/06/2026', time: '13:30:00' },
  { pm25: 17.2, temperature: 28.9, humidity: 64.0, pressure: 1012.5, uv: 4.1, date: '01/06/2026', time: '14:00:00' },
  { pm25: 14.5, temperature: 28.3, humidity: 65.5, pressure: 1012.3, uv: 3.2, date: '01/06/2026', time: '14:30:00' },
  { pm25: 16.8, temperature: 27.8, humidity: 66.0, pressure: 1012.1, uv: 2.5, date: '01/06/2026', time: '15:00:00' },
  { pm25: 18.5, temperature: 28.3, humidity: 65.2, pressure: 1013.2, uv: 3.5, date: '01/06/2026', time: '21:10:00' },
];

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const stmt = db.prepare(`
  INSERT INTO readings (pm25, temperature, humidity, pressure, uv, aqi, aqi_level, sensor_date, sensor_time, received_at)
  VALUES (@pm25, @temperature, @humidity, @pressure, @uv, @aqi, @aqi_level, @sensor_date, @sensor_time,
    datetime('now', '-' || @offset_min || ' minutes'))
`);

const insertMany = db.transaction((rows) => {
  rows.forEach((r, i) => {
    const aqi = pm25ToAqi(r.pm25);
    stmt.run({
      ...r,
      aqi,
      aqi_level: aqiLevel(aqi),
      sensor_date: r.date,
      sensor_time: r.time,
      offset_min: (rows.length - i) * 30,
    });
  });
});

insertMany(readings);
console.log(`✅ Seeded ${readings.length} readings into ${DB_PATH}`);
db.close();
