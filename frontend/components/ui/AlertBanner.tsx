'use client';

import { useEffect, useRef, useState } from 'react';
import type { AqiLevel } from '@/lib/types';

interface Props {
  level: AqiLevel;
  color: string;
  bgColor: string;
  message: string;
  action: string;
}

const DISMISS_KEY = 'aqi_alert_dismissed';
const DISMISS_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export default function AlertBanner({ level, color, bgColor, message, action }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const lastLevelRef = useRef<AqiLevel | null>(null);

  // Re-show banner if the AQI level changes (anti-fatigue logic)
  useEffect(() => {
    if (lastLevelRef.current && lastLevelRef.current !== level) {
      setDismissed(false);
      localStorage.removeItem(DISMISS_KEY);
    }
    lastLevelRef.current = level;
  }, [level]);

  // Restore dismissed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored) {
      const { dismissedAt, dismissedLevel } = JSON.parse(stored);
      const age = Date.now() - dismissedAt;
      if (age < DISMISS_DURATION_MS && dismissedLevel === level) {
        setDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
      }
    }
  }, [level]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ dismissedAt: Date.now(), dismissedLevel: level }));
  };

  if (dismissed) return null;

  const icon =
    level === 'Good' ? '✅' :
    level === 'Moderate' ? 'ℹ️' :
    level === 'Unhealthy for Sensitive Groups' ? '⚠️' :
    level === 'Unhealthy' ? '🔴' :
    level === 'Very Unhealthy' ? '🚨' : '☣️';

  return (
    <div
      className="alert-banner fade-in"
      style={{
        background: bgColor,
        borderColor: color + '40',
        color,
      }}
      role="alert"
    >
      <div className="alert-banner-left">
        <span className="alert-icon">{icon}</span>
        <div>
          <div className="alert-title">{level}</div>
          <div className="alert-message" style={{ color: 'var(--text-primary)' }}>
            {message}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexShrink: 0 }}>
        <button className="alert-action-btn" style={{ color }} onClick={handleDismiss}>
          {action}
        </button>
        <button className="alert-dismiss" onClick={handleDismiss} aria-label="Dismiss alert">
          ✕
        </button>
      </div>
    </div>
  );
}
