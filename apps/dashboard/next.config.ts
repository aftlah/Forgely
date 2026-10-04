import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const config: NextConfig = {
  // Workspace packages ship TypeScript source, so Next must compile them.
  transpilePackages: ["@forgely/ui", "@forgely/shared"],
  // Tell Next where the monorepo root is so it resolves the single pnpm lockfile.
  turbopack: { root: repoRoot },
};

export default config;
