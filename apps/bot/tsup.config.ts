import { defineConfig } from "tsup";

export default defineConfig({
  // `main` is the cluster manager; `bot` is the process it spawns per cluster.
  entry: ["src/main.ts", "src/bot.ts"],
  format: ["esm"],
  target: "node22",
  sourcemap: true,
  clean: true,
  // Workspace packages ship TypeScript source, so they must be bundled in.
  noExternal: [/^@forgely\//],
});
