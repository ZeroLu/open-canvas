import type { NextConfig } from 'next';
import path from 'node:path';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd()),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
