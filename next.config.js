const withPWA = require('next-pwa');

const nextConfig = {
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
  },
};

module.exports = withPWA(nextConfig);
