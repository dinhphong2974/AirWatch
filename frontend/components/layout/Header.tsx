'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-GB'));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="header-clock">{time}</span>;
}

export default function Header() {
  return (
    <header className="app-header header">
      <Link href="/" className="header-logo">
        <div className="header-logo-icon">🌬️</div>
        <span>AirWatch</span>
      </Link>

      <div className="header-right">
        <div className="header-location">
          <span>📍</span>
          <span>Lab Station 1</span>
        </div>
        <LiveClock />
      </div>
    </header>
  );
}
