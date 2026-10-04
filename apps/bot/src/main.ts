import { fileURLToPath } from "node:url";

import { ClusterManager } from "discord-hybrid-sharding";

import { loadEnv } from "./config/env";
import { createLogger } from "./core/logger";

/** Shards per spawned process. Raise the cluster count, not this, when scaling out. */
const SHARDS_PER_CLUSTER = 2;

/**
 * Production entry: a ClusterManager that spawns `bot.js` per cluster. With a small bot
 * Discord assigns one shard, so this runs a single cluster and behaves like a normal bot.
 */
async function startManager(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);

  const manager = new ClusterManager(fileURLToPath(new URL("./bot.js", import.meta.url)), {
    token: env.DISCORD_TOKEN,
    totalShards: "auto",
    shardsPerClusters: SHARDS_PER_CLUSTER,
    mode: "process",
  });

  manager.on("clusterCreate", (cluster) =>
    logger.info({ cluster: cluster.id }, "Cluster launched"),
  );
  await manager.spawn({ timeout: -1 });
}

try {
  await startManager();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
