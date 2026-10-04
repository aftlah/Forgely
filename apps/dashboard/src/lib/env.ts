import { z } from "zod";

import { snowflakeSchema } from "@forgely/shared";

const DEFAULT_DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const MIN_AUTH_SECRET_LENGTH = 32;

const serverEnvSchema = z.object({
  AUTH_SECRET: z.string().min(MIN_AUTH_SECRET_LENGTH),
  AUTH_DISCORD_ID: snowflakeSchema,
  AUTH_DISCORD_SECRET: z.string().min(1),
  DATABASE_URL: z.string().url(),
  /** Tests only: points the dashboard at a fake Discord API. Never set this in production. */
  DISCORD_API_BASE_URL: z.string().url().default(DEFAULT_DISCORD_API_BASE_URL),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Where to read variables from. Plain objects in tests; `process.env` in the app. */
type EnvSource = Record<string, string | undefined>;

/** The variables Auth.js needs to sign people in. Used to explain a half-configured setup. */
const AUTH_ENV_NAMES = ["AUTH_SECRET", "AUTH_DISCORD_ID", "AUTH_DISCORD_SECRET"] as const;

/**
 * Reads and validates the server-side environment. Call it where the values are used, not at
 * import time, so `next build` and the public landing page work without secrets.
 */
export function getServerEnv(source: EnvSource = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(`Invalid dashboard environment:\n${problems.join("\n")}`);
}

const settingsEnvSchema = z.object({
  /** Lets the dashboard list a server's channels and roles. Server-side only, never sent to a browser. */
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_API_BASE_URL: z.string().url().default(DEFAULT_DISCORD_API_BASE_URL),
  /** Optional. With it, a saved change reaches the bot instantly; without it the bot polls (~10 s). */
  REDIS_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
});

export type SettingsEnv = z.infer<typeof settingsEnvSchema>;

/** What the settings pages need on top of sign-in. Read where used, so login works without it. */
export function getSettingsEnv(source: EnvSource = process.env): SettingsEnv {
  const result = settingsEnvSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(`Invalid dashboard settings environment:\n${problems.join("\n")}`);
}

/** Names of the sign-in variables that are missing or empty. */
export function getMissingAuthEnv(source: EnvSource = process.env): string[] {
  return AUTH_ENV_NAMES.filter((name) => !source[name]);
}
