import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path alias in tsconfig.json so tests can import app code the same way.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
