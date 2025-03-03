/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    // Required for BullMQ to work with Next.js
    config.externals = [...config.externals, 'ioredis'];
    return config;
  },
  // Increase the body parser size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;