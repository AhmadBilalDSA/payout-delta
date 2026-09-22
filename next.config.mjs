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
};

export default nextConfig;