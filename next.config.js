const withPWA = require('next-pwa');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
  },
};

module.exports = withPWA(nextConfig);
