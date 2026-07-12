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
  // Packages that use workerd-specific build conditions (e.g. pg-cloudflare uses
  // cloudflare:sockets) must be marked as external so @opennextjs/cloudflare's
  // esbuild bundler can resolve them using the "workerd" condition.
  serverExternalPackages: ["pg-cloudflare"],
};

export default withNextIntl(nextConfig);
