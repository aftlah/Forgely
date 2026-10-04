import { loadEnv } from "./config/env";
import { createApp } from "./core/app";
import { attachHandlers, createDiscordClient } from "./core/client";

/**
 * Bot process entry. Run directly in development (`pnpm dev`) as a single client, or spawned
 * once per cluster by main.ts in production.
 */
async function startBot(): Promise<void> {
  const env = loadEnv();
  const { context, registry, shutdown } = await createApp(env);
  const client = createDiscordClient();
  attachHandlers(client, registry, context);

  const stop = async (signal: string): Promise<void> => {
    context.logger.info({ signal }, "Shutting down");
    await client.destroy();
    await shutdown();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));

  await client.login(env.DISCORD_TOKEN);
}

try {
  await startBot();
} catch (error) {
  // Logging infrastructure may not exist yet (for example when env validation failed).
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
