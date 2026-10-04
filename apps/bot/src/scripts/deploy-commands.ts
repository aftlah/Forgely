import { loadEnv } from "../config/env";
import { createModuleRegistry } from "../core/module-registry";
import { registerSlashCommands } from "../core/register-commands";
import { botModules } from "../modules";

const env = loadEnv();
const count = await registerSlashCommands(createModuleRegistry(botModules), env);
const scope = env.DISCORD_DEV_GUILD_ID
  ? `guild ${env.DISCORD_DEV_GUILD_ID}`
  : "all guilds (global)";
process.stdout.write(`Registered ${count} slash command(s) for ${scope}.\n`);
