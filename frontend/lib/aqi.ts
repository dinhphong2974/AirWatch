// ─────────────────────────────────────────────────────────────────────────────
// AQI Calculator — US-EPA Standard
// Pure functions, fully unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

import type { AqiInfo, AqiLevel, AlertLevel, MetricAlert } from './types';

// US-EPA PM2.5 breakpoints: [pm25_lo, pm25_hi, aqi_lo, aqi_hi]
const PM25_BREAKPOINTS: [number, number, number, number][] = [
  [0.0,   12.0,   0,   50],
  [12.1,  35.4,  51,  100],
  [35.5,  55.4, 101,  150],
  [55.5, 150.4, 151,  200],
  [150.5, 250.4, 201,  300],
  [250.5, 500.4, 301,  500],
];

const AQI_LEVELS: {
  level: AqiLevel;
  color: string;
  bgColor: string;
  message: string;
  action: string;
}[] = [
  {
    level: 'Good',
    color: '#00E400',
    bgColor: 'rgba(0,228,0,0.12)',
    message: 'Air quality is satisfactory and poses little or no risk.',
    action: 'Enjoy outdoor activities.',
  },
  {
    level: 'Moderate',
    color: '#FFFF00',
    bgColor: 'rgba(255,255,0,0.12)',
    message: 'Air quality is acceptable. Some pollutants may affect sensitive people.',
    action: 'Unusually sensitive people should reduce prolonged exertion.',
  },
  {
    level: 'Unhealthy for Sensitive Groups',
    color: '#FF7E00',
    bgColor: 'rgba(255,126,0,0.15)',
    message: 'Members of sensitive groups may experience health effects.',
    action: 'Sensitive groups should limit prolonged outdoor exertion.',
  },
  {
    level: 'Unhealthy',
    color: '#FF0000',
    bgColor: 'rgba(255,0,0,0.15)',
    message: 'Everyone may begin to experience health effects.',
    action: 'Everyone should reduce prolonged outdoor exertion.',
  },
  {
    level: 'Very Unhealthy',
    color: '#8F3F97',
    bgColor: 'rgba(143,63,151,0.18)',
    message: 'Health alert: everyone may experience serious health effects.',
    action: 'Avoid all outdoor activities. Stay indoors.',
  },
  {
    level: 'Hazardous',
    color: '#7E0023',
    bgColor: 'rgba(126,0,35,0.20)',
    message: 'Health warnings of emergency conditions.',
    action: 'Stay indoors. Wear N95 mask if going outside is unavoidable.',
  },
];

/**
 * Calculate AQI from a PM2.5 concentration using the US-EPA linear interpolation formula.
 * Returns 0 for negative/zero values, 500 for values above the highest breakpoint.
 */
export function pm25ToAqi(pm25: number): number {
  if (pm25 < 0) return 0;
  const pm = Math.round(pm25 * 10) / 10; // round to 1 decimal per EPA spec

  for (const [cLo, cHi, iLo, iHi] of PM25_BREAKPOINTS) {
    if (pm >= cLo && pm <= cHi) {
      return Math.round(((iHi - iLo) / (cHi - cLo)) * (pm - cLo) + iLo);
    }
  }
  return 500; // above hazardous ceiling
}

/** Get full AQI info object (level, color, message, action) for a given AQI value */
export function getAqiInfo(aqi: number): AqiInfo {
  let index = 0;
  if (aqi <= 50)        index = 0;
  else if (aqi <= 100)  index = 1;
  else if (aqi <= 150)  index = 2;
  else if (aqi <= 200)  index = 3;
  else if (aqi <= 300)  index = 4;
  else                  index = 5;

  return { aqi, ...AQI_LEVELS[index] };
}

/** Convenience: calculate AQI info directly from PM2.5 */
export function getAqiInfoFromPm25(pm25: number): AqiInfo {
  return getAqiInfo(pm25ToAqi(pm25));
}

// ─── Alert levels for non-PM2.5 metrics ────────────────────────────────────

export function getTemperatureAlert(temp: number): MetricAlert {
  if (temp < 0 || temp > 40) return { level: 'danger', color: '#FF0000' };
  if (temp < 10 || temp > 35) return { level: 'warning', color: '#FF7E00' };
  return { level: 'normal', color: '#00E400' };
}

export function getHumidityAlert(hum: number): MetricAlert {
  if (hum < 15 || hum > 95) return { level: 'danger', color: '#FF0000' };
  if (hum < 25 || hum > 80) return { level: 'warning', color: '#FF7E00' };
  return { level: 'normal', color: '#00E400' };
}

export function getPressureAlert(pres: number): MetricAlert {
  if (pres < 980) return { level: 'danger', color: '#FF0000' };
  if (pres < 990 || pres > 1030) return { level: 'warning', color: '#FF7E00' };
  return { level: 'normal', color: '#00E400' };
}

export function getUvAlert(uv: number): MetricAlert {
  if (uv >= 11) return { level: 'danger', color: '#FF0000' };
  if (uv >= 6)  return { level: 'warning', color: '#FF7E00' };
  return { level: 'normal', color: '#00E400' };
}

/** Get human-readable UV index category */
export function getUvCategory(uv: number): string {
  if (uv < 3)  return 'Low';
  if (uv < 6)  return 'Moderate';
  if (uv < 8)  return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

/** Get UV category color */
export function getUvColor(uv: number): string {
  if (uv < 3)  return '#4FC3F7';
  if (uv < 6)  return '#FFF176';
  if (uv < 8)  return '#FF7E00';
  if (uv < 11) return '#FF0000';
  return '#8F3F97';
}

/** Format trend arrow and value string */
export function formatTrend(current: number, previous: number | undefined, decimals = 1): string {
  if (previous === undefined) return '—';
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return '→ stable';
  const arrow = diff > 0 ? '▲' : '▼';
  return `${arrow} ${Math.abs(diff).toFixed(decimals)}`;
}

/** Needle rotation angle for semicircle AQI gauge (0° = left, 180° = right) */
export function aqiToNeedleAngle(aqi: number): number {
  const clamped = Math.min(500, Math.max(0, aqi));
  return (clamped / 500) * 180;
}
