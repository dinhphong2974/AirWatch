'use client';

interface Props {
  isLive: boolean;
  lastUpdated: string | null; // ISO string
}

function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60)  return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function StatusBadge({ isLive, lastUpdated }: Props) {
  return (
    <div className={`live-badge ${isLive ? '' : 'offline'}`}>
      <div className="live-dot" />
      <span>{isLive ? 'LIVE' : 'OFFLINE'}</span>
      {lastUpdated && (
        <span style={{ opacity: 0.7, fontWeight: 400 }}>· {timeAgo(lastUpdated)}</span>
      )}
    </div>
  );
}
