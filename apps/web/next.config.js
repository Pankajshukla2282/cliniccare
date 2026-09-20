/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,

  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },

  // Prisma is owned by the NestJS API. The web app must not bundle or
  // execute the API's generated Prisma client.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
