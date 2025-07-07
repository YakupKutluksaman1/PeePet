import type { NextConfig } from "next";

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

export default nextConfig;
