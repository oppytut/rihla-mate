import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  output: "standalone",
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Next.js 16 edge-runtime bug: references removed node:util/types
      config.externals = Array.isArray(config.externals)
        ? [...config.externals, "node:util/types"]
        : ["node:util/types"];
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
