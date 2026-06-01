import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow better-sqlite3 native addon to work in server context
  serverExternalPackages: ['better-sqlite3'],

  // Allow LAN devices to access the dev server without cross-origin block
  allowedDevOrigins: ['192.168.0.101', '192.168.1.*', '10.0.0.*'],

  // Custom headers for CORS (allow ESP32 to POST from any origin)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
