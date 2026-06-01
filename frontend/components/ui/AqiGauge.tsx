'use client';

import { aqiToNeedleAngle } from '@/lib/aqi';
import type { AqiInfo } from '@/lib/types';
import styles from './AqiGauge.module.css';

interface Props {
  aqiInfo: AqiInfo | null;
}

// 6 color zones for the semicircle arc
const AQI_ZONES = [
  { color: '#00E400', start: 0,   end: 30  },  // Good
  { color: '#FFFF00', start: 30,  end: 60  },  // Moderate
  { color: '#FF7E00', start: 60,  end: 90  },  // Sensitive
  { color: '#FF0000', start: 90,  end: 120 },  // Unhealthy
  { color: '#8F3F97', start: 120, end: 150 },  // Very Unhealthy
  { color: '#7E0023', start: 150, end: 180 },  // Hazardous
];

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle - 90));
  const y1 = cy + r * Math.sin(toRad(startAngle - 90));
  const x2 = cx + r * Math.cos(toRad(endAngle - 90));
  const y2 = cy + r * Math.sin(toRad(endAngle - 90));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function AqiGauge({ aqiInfo }: Props) {
  const cx = 140, cy = 130, r = 100;
  const angle = aqiInfo ? aqiToNeedleAngle(aqiInfo.aqi) : 0;

  // Needle endpoint — angle 0=left, 90=top, 180=right (matches arc direction)
  const needleRad = ((angle - 180) * Math.PI) / 180;
  const nx = cx + 88 * Math.cos(needleRad);
  const ny = cy + 88 * Math.sin(needleRad);

  const color = aqiInfo?.color ?? '#4B5563';

  return (
    <div className={styles.card}>
      <svg
        viewBox="0 0 280 150"
        className={styles.svg}
        aria-label={`AQI gauge showing ${aqiInfo?.aqi ?? '--'}`}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track background */}
        <path d={describeArc(cx, cy, r, -90, 90)} fill="none"
          stroke="hsla(210,20%,30%,0.5)" strokeWidth="14" strokeLinecap="round" />

        {/* Colored zones */}
        {AQI_ZONES.map((z) => (
          <path
            key={z.color}
            d={describeArc(cx, cy, r, z.start - 90, z.end - 90)}
            fill="none"
            stroke={z.color}
            strokeWidth="14"
            strokeLinecap="butt"
            opacity="0.85"
          />
        ))}

        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={nx}  y2={ny}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#glow)"
          style={{ transition: 'x2 800ms ease, y2 800ms ease' }}
        />

        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r="6" fill={color} filter="url(#glow)" />
        <circle cx={cx} cy={cy} r="3" fill="var(--bg-base)" />
      </svg>

      {/* Center text overlay */}
      <div className={styles.centerText}>
        <span className={styles.number} style={{ color }}>
          {aqiInfo?.aqi ?? '—'}
        </span>
        <span className={styles.level} style={{ color }}>
          {aqiInfo?.level ?? 'No Data'}
        </span>
        <span className={styles.message}>
          {aqiInfo?.message ?? 'Waiting for sensor data...'}
        </span>
      </div>
    </div>
  );
}
