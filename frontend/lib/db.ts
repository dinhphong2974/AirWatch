// ─────────────────────────────────────────────────────────────────────────────
// SQLite Database — Singleton connection + schema init
// ─────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { SensorPayload, SensorReading, HistoryResponse } from './types';
import { pm25ToAqi, getAqiInfo } from './aqi';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'aqi.db');

// Singleton instance
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  // Create data directory if not exists (for local dev)
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      pm25        REAL    NOT NULL,
      temperature REAL    NOT NULL,
      humidity    REAL    NOT NULL,
      pressure    REAL    NOT NULL,
      uv          REAL    NOT NULL,
      aqi         INTEGER NOT NULL,
      aqi_level   TEXT    NOT NULL,
      sensor_date TEXT    NOT NULL,
      sensor_time TEXT    NOT NULL,
      received_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_received_at ON readings (received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sensor_date ON readings (sensor_date);
  `);
}

/** Insert a new sensor reading. Returns the inserted row id. */
export function insertReading(payload: SensorPayload): number {
  const db = getDb();
  const aqi = pm25ToAqi(payload.pm25);
  const aqiInfo = getAqiInfo(aqi);

  const stmt = db.prepare(`
    INSERT INTO readings (pm25, temperature, humidity, pressure, uv, aqi, aqi_level, sensor_date, sensor_time)
    VALUES (@pm25, @temperature, @humidity, @pressure, @uv, @aqi, @aqi_level, @sensor_date, @sensor_time)
  `);

  const result = stmt.run({
    pm25: payload.pm25,
    temperature: payload.temperature,
    humidity: payload.humidity,
    pressure: payload.pressure,
    uv: payload.uv,
    aqi,
    aqi_level: aqiInfo.level,
    sensor_date: payload.date,
    sensor_time: payload.time,
  });

  return Number(result.lastInsertRowid);
}

/** Get the most recent reading */
export function getLatestReading(): SensorReading | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM readings ORDER BY received_at DESC LIMIT 1
  `).get() as SensorReading | undefined;
  return row ?? null;
}

/** Get paginated history with optional date filters */
export function getHistory(opts: {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}): HistoryResponse {
  const db = getDb();
  const limit = Math.min(opts.limit ?? 100, 1000);
  const offset = opts.offset ?? 0;

  let where = '1=1';
  const params: Record<string, string | number> = { limit, offset };

  if (opts.from) { where += ' AND received_at >= @from'; params.from = opts.from; }
  if (opts.to)   { where += ' AND received_at <= @to';   params.to = opts.to; }

  const data = db.prepare(`
    SELECT * FROM readings WHERE ${where}
    ORDER BY received_at DESC LIMIT @limit OFFSET @offset
  `).all(params) as SensorReading[];

  const countRow = db.prepare(`
    SELECT COUNT(*) as count FROM readings WHERE ${where}
  `).get(params) as { count: number };

  const summaryRow = db.prepare(`
    SELECT
      MIN(pm25) as pm25_min, MAX(pm25) as pm25_max, AVG(pm25) as pm25_avg,
      MIN(temperature) as temp_min, MAX(temperature) as temp_max, AVG(temperature) as temp_avg,
      MIN(humidity) as hum_min, MAX(humidity) as hum_max, AVG(humidity) as hum_avg,
      MIN(pressure) as pres_min, MAX(pressure) as pres_max, AVG(pressure) as pres_avg,
      MIN(uv) as uv_min, MAX(uv) as uv_max, AVG(uv) as uv_avg
    FROM readings WHERE ${where}
  `).get(params) as Record<string, number>;

  const r2 = (n: number | null) =>
    n === null || n === undefined ? null : Math.round(n * 100) / 100;

  // When no rows match, SQLite aggregates return NULL — return null summary
  if (countRow.count === 0) {
    return {
      data: [],
      total: 0,
      summary: {
        pm25:        { min: null, max: null, avg: null },
        temperature: { min: null, max: null, avg: null },
        humidity:    { min: null, max: null, avg: null },
        pressure:    { min: null, max: null, avg: null },
        uv:          { min: null, max: null, avg: null },
      },
    };
  }

  return {
    data,
    total: countRow.count,
    summary: {
      pm25:        { min: r2(summaryRow.pm25_min), max: r2(summaryRow.pm25_max), avg: r2(summaryRow.pm25_avg) },
      temperature: { min: r2(summaryRow.temp_min), max: r2(summaryRow.temp_max), avg: r2(summaryRow.temp_avg) },
      humidity:    { min: r2(summaryRow.hum_min),  max: r2(summaryRow.hum_max),  avg: r2(summaryRow.hum_avg) },
      pressure:    { min: r2(summaryRow.pres_min), max: r2(summaryRow.pres_max), avg: r2(summaryRow.pres_avg) },
      uv:          { min: r2(summaryRow.uv_min),   max: r2(summaryRow.uv_max),   avg: r2(summaryRow.uv_avg) },
    },
  };
}
