import { REST, Routes } from "discord.js";

import type { BotEnv } from "../config/env";

import type { ModuleRegistry } from "./module-registry";

/**
 * Pushes the registry's slash commands to Discord. With DISCORD_DEV_GUILD_ID set they go to
 * that guild and appear instantly; otherwise they are registered globally (can take up to an hour).
 * Returns the number of commands registered.
 */
export async function registerSlashCommands(
  registry: ModuleRegistry,
  env: Pick<BotEnv, "DISCORD_TOKEN" | "DISCORD_CLIENT_ID" | "DISCORD_DEV_GUILD_ID">,
): Promise<number> {
  const body = registry.getCommands().map((command) => command.data.toJSON());
  const rest = new REST().setToken(env.DISCORD_TOKEN);

  const route = env.DISCORD_DEV_GUILD_ID
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_DEV_GUILD_ID)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

  await rest.put(route, { body });
  return body.length;
}
