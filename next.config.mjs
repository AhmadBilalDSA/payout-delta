/** @type {import('next').NextConfig} */
const USE_CUSTOM_DOMAIN = false; // set to true once ready to point payoutdelta.com
const repoPrefix = USE_CUSTOM_DOMAIN ? '' : '/payout-delta';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  basePath: process.env.NODE_ENV === 'production' ? repoPrefix : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? repoPrefix : '',
  // Build timeout configuration to prevent worker starvation on 208+ corridors
    experimental: {
      // Limit concurrent workers to prevent OOM on CI
      cpus: 2,
      // Disable worker threads to avoid fork overhead
      workerThreads: false,
    },
  // Increase generation timeout per route (default is 30s)
  generateBuildId: async () => {
    return 'payout-delta-' + Date.now();
  },
};

export default nextConfig;