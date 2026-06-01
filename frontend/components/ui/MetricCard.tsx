'use client';

import { useEffect, useRef, useState } from 'react';
import type { AlertLevel } from '@/lib/types';
import styles from './MetricCard.module.css';

interface Props {
  label: string;
  value: number | null;
  unit: string;
  icon: string;
  decimals?: number;
  trend?: string;
  trendUp?: boolean;
  alertLevel?: AlertLevel;
  accentColor?: string;
}

export default function MetricCard({
  label, value, unit, icon,
  decimals = 1, trend, trendUp, alertLevel = 'normal', accentColor,
}: Props) {
  const [pulse, setPulse] = useState(false);
  const prevValue = useRef<number | null>(null);

  // Trigger pulse animation on value change
  useEffect(() => {
    if (prevValue.current !== null && value !== null && value !== prevValue.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      return () => clearTimeout(t);
    }
    prevValue.current = value;
  }, [value]);

  const color = accentColor ?? (
    alertLevel === 'danger'  ? 'var(--aqi-unhealthy)' :
    alertLevel === 'warning' ? 'var(--aqi-sensitive)' :
    'var(--accent-blue)'
  );

  const displayVal = value !== null ? value.toFixed(decimals) : '—';

  return (
    <div
      className={`${styles.card} ${pulse ? styles.pulse : ''}`}
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.icon}>{icon}</span>
      </div>

      <div className={styles.valueRow}>
        <span className={`${styles.value} mono`}>{displayVal}</span>
        <span className={styles.unit}>{unit}</span>
      </div>

      {trend !== undefined && (
        <span className={`${styles.trend} ${
          trend === '→ stable' ? styles.flat :
          trendUp ? styles.up : styles.down
        }`}>
          {trend}
        </span>
      )}
    </div>
  );
}
