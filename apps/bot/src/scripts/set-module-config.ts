import { Redis } from "ioredis";

import { createDatabase, createGuildConfigRepository } from "@forgely/db";
import { REDIS_CHANNELS, snowflakeSchema } from "@forgely/shared";

import { loadEnv } from "../config/env";
import { botModules } from "../modules";

/**
 * Developer tool until the dashboard exists (Phase 3): turns a module on or off for one guild
 * and optionally changes its settings. The config is validated with the module's own schema.
 */
const USAGE =
  "Usage: pnpm --filter @forgely/bot config:set <guildId> <moduleId> <on|off> [partialConfigJson]";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Applies `patch` on top of `base`, recursing into nested objects; arrays are replaced whole. */
function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isJsonObject(base) || !isJsonObject(patch)) return patch;
  const merged: JsonObject = { ...base };
  for (const [key, value] of Object.entries(patch)) merged[key] = deepMerge(base[key], value);
  return merged;
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const [guildIdArg, moduleId, switchArg, patchArg] = process.argv.slice(2);
if (!guildIdArg || !moduleId || (switchArg !== "on" && switchArg !== "off")) fail(USAGE);

const guildId = snowflakeSchema.safeParse(guildIdArg);
if (!guildId.success) fail(`"${guildIdArg}" is not a valid guild ID.\n${USAGE}`);

const definition = botModules.find((module) => module.id === moduleId)?.config;
if (!definition) {
  const known = botModules.filter((module) => module.config).map((module) => module.id);
  fail(`Unknown or non-configurable module "${moduleId}". Available: ${known.join(", ")}`);
}

const patch: unknown = patchArg ? JSON.parse(patchArg) : {};
const parsed = definition.schema.safeParse(deepMerge(definition.defaults, patch));
if (!parsed.success) fail(`Invalid config:\n${JSON.stringify(parsed.error.issues, null, 2)}`);

const env = loadEnv();
const database = createDatabase(env.DATABASE_URL);
await createGuildConfigRepository(database.db).saveModuleConfig({
  guildId: guildId.data,
  moduleId,
  isEnabled: switchArg === "on",
  configVersion: definition.version,
  config: parsed.data,
});

if (env.REDIS_URL) {
  const redis = new Redis(env.REDIS_URL);
  await redis.publish(
    REDIS_CHANNELS.configUpdated,
    JSON.stringify({ guildId: guildId.data, moduleId }),
  );
  redis.disconnect();
}
await database.close();

process.stdout.write(
  `Module "${moduleId}" is now ${switchArg} for guild ${guildId.data}.\n${JSON.stringify(parsed.data, null, 2)}\n` +
    (env.REDIS_URL ? "" : "Without Redis the running bot picks this up within ~10 seconds.\n"),
);
