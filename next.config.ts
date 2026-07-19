import type { NextConfig } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      // Same-origin proxy for admin API calls. Next.js rewrites proxy the
      // request server-side, so Set-Cookie responses from the backend land
      // first-party on the frontend's own domain — letting httpOnly auth
      // cookies work even though the deployed frontend (Vercel) and backend
      // (Render) are on different origins (third-party cookies would
      // otherwise be blocked by browsers).
      {
        source: '/backend-api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
