import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow any HTTP/HTTPS source — Awin/Datafeedr merchant product images
      // come from hundreds of different retailer domains (some served over http).
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
