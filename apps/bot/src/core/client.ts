import { ClusterClient, getInfo } from "discord-hybrid-sharding";
import { Client, Events, GatewayIntentBits } from "discord.js";

import { createCommandRouter } from "./command-router";
import { handleEventError } from "./error-handler";
import type { ModuleRegistry } from "./module-registry";
import type { AppContext } from "./types";

/** Gateway intents. Add one here only when a module needs it, and document why. */
const INTENTS = [
  GatewayIntentBits.Guilds,
  // Privileged. The welcome module needs member join/leave events. Must be enabled in the
  // Developer Portal (Bot > Privileged Gateway Intents) and verified above 100 servers.
  GatewayIntentBits.GuildMembers,
];

/** True when this process was spawned by the ClusterManager (see main.ts). */
function isClusterChild(): boolean {
  return (
    process.env.CLUSTER_MANAGER_MODE === "worker" || process.env.CLUSTER_MANAGER_MODE === "process"
  );
}

/**
 * Creates the Discord client. Under the ClusterManager it takes its shard assignment from the
 * manager; run directly (pnpm dev) it is a single standard client, so no setup is needed locally.
 */
export function createDiscordClient(): Client {
  if (!isClusterChild()) return new Client({ intents: INTENTS });

  const clusterInfo = getInfo();
  const client = new Client({
    intents: INTENTS,
    shards: clusterInfo.SHARD_LIST,
    shardCount: clusterInfo.TOTAL_SHARDS,
  });
  // The cluster client attaches itself to `client.cluster` and handles manager messaging.
  Object.assign(client, { cluster: new ClusterClient(client) });
  return client;
}

/** Attaches the command router and every module's event handlers to the client. */
export function attachHandlers(client: Client, registry: ModuleRegistry, app: AppContext): void {
  client.on(Events.InteractionCreate, createCommandRouter(registry, app));

  for (const { event, module } of registry.getEvents()) {
    const logger = app.logger.child({ module: module.id, event: String(event.name) });
    const listener = (...args: unknown[]): void => {
      const run = event.execute as (app: AppContext, ...eventArgs: unknown[]) => Promise<void>;
      run(app, ...args).catch((error: unknown) => handleEventError(error, logger));
    };

    if (event.once) client.once(event.name, listener);
    else client.on(event.name, listener);
  }
}
