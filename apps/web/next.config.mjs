/** @type {import('next').NextConfig} */
// Vercel does not support `output: 'standalone'` — it manages its own output.
// Standalone mode is only used for self-hosted Docker deployments.
const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  // Turbopack: map .js imports to .ts/.tsx so ESM-style ".js" extensions resolve.
  turbopack: {
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    },
  },
  // dev (localhost:3001) and production (behind Caddy at /api)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
  transpilePackages: ['@aems/shared-types'],
};

export default nextConfig;
