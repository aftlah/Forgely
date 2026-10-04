import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const config: NextConfig = {
  // Workspace packages ship TypeScript source, so Next must compile them.
  transpilePackages: ["@forgely/ui", "@forgely/shared", "@forgely/db"],
  // Tell Next where the monorepo root is so it resolves the single pnpm lockfile.
  turbopack: { root: repoRoot },
  // Server icons come from Discord's CDN.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com", pathname: "/icons/**" }],
  },
  // postgres.js uses Node APIs; keep it out of the bundle and load it from node_modules at runtime.
  serverExternalPackages: ["postgres", "ioredis"],
};

export default config;
