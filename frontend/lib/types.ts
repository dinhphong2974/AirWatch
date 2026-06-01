// ─────────────────────────────────────────────────────────────────────────────
// Sensor & AQI Types — Air Quality Dashboard v2
// ─────────────────────────────────────────────────────────────────────────────

export type AqiLevel =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous';

export interface AqiInfo {
  aqi: number;
  level: AqiLevel;
  color: string;
  bgColor: string;
  message: string;
  action: string;
}

/** Raw payload sent by ESP32 via HTTP POST */
export interface SensorPayload {
  pm25: number;
  temperature: number;
  humidity: number;
  pressure: number;
  uv: number;
  date: string; // "DD/MM/YYYY"
  time: string; // "HH:MM:SS"
}

/**
 * Full reading as stored in SQLite.
 * Note: does NOT extend SensorPayload — DB rows have 'sensor_date'/'sensor_time'
 * columns but NOT 'date'/'time', so we define fields explicitly.
 */
export interface SensorReading {
  id: number;
  pm25: number;
  temperature: number;
  humidity: number;
  pressure: number;
  uv: number;
  aqi: number;
  aqi_level: AqiLevel;
  sensor_date: string; // e.g. "01/06/2026"
  sensor_time: string; // e.g. "14:30:00"
  received_at: string; // ISO 8601 UTC
}

/** Enriched reading returned by /api/latest */
export interface LatestResponse extends SensorReading {
  aqiColor: string;
  aqiMessage: string;
  aqiAction: string;
}

/** Summary statistics for a set of readings. Fields are null when no data is available. */
export interface MetricSummary {
  min: number | null;
  max: number | null;
  avg: number | null;
}

/** Response from /api/history */
export interface HistoryResponse {
  data: SensorReading[];
  total: number;
  summary: {
    pm25: MetricSummary;
    temperature: MetricSummary;
    humidity: MetricSummary;
    pressure: MetricSummary;
    uv: MetricSummary;
  };
}

/** Alert level for individual metrics (non-PM2.5) */
export type AlertLevel = 'normal' | 'warning' | 'danger';

export interface MetricAlert {
  level: AlertLevel;
  color: string;
}
