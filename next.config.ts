import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow any HTTPS source — needed for Datafeedr merchant product images
      // which can come from hundreds of different retailer domains.
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
