import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  eslint: {
    // Production build'de ESLint hatalarını yok say
    ignoreDuringBuilds: true,
  },
  // TypeScript hatalarını da yok say (opsiyonel)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withPWA({
  ...nextConfig,
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
  },
});
