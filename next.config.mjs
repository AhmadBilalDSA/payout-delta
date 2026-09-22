/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Automatically applies /payout-delta only for the production export
  basePath: isProd ? '/payout-delta' : '',
  assetPrefix: isProd ? '/payout-delta/' : '',
};

export default nextConfig;