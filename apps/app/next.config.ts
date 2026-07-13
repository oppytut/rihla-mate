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
  //
  // "util" and "util/types" are listed because Turbopack (unlike webpack) does
  // not intercept Node.js built-in require() calls from bundled CJS deps.
  // pg/lib/client.js does require("util") and pg/lib/utils.js does
  // require("util/types"), so marking them external prevents the edge bundle
  // from containing unresolvable node:util references.
  serverExternalPackages: ["pg", "pg-cloudflare", "util", "util/types"],
};

export default withNextIntl(nextConfig);
