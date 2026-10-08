const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: isProd ? '/payout-delta' : '',
  assetPrefix: isProd ? '/payout-delta/' : '',
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    cpus: 2,
    workerThreads: false,
  },
};

export default nextConfig;
