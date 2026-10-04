import { z } from "zod";

import { SNOWFLAKE_PATTERN } from "@forgely/shared";

/** Treats an empty string (a blank line in .env) the same as an unset variable. */
const blankToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().regex(SNOWFLAKE_PATTERN),
    DISCORD_DEV_GUILD_ID: z.preprocess(
      blankToUndefined,
      z.string().regex(SNOWFLAKE_PATTERN).optional(),
    ),
    DATABASE_URL: z.string().url(),
    /** Optional in development (in-memory cache). Required in production. */
    REDIS_URL: z.preprocess(blankToUndefined, z.string().url().optional()),
    SENTRY_DSN: z.preprocess(blankToUndefined, z.string().url().optional()),
  })
  .superRefine((env, context) => {
    // Without Redis, config cache lives in one process's memory and dashboard changes
    // would not reach other shards. Fine locally, never in production.
    if (env.NODE_ENV === "production" && !env.REDIS_URL) {
      context.addIssue({
        code: "custom",
        path: ["REDIS_URL"],
        message: "is required when NODE_ENV=production",
      });
    }
  });

export type BotEnv = z.infer<typeof envSchema>;

/** Thrown at startup when environment variables are missing or malformed. */
export class EnvValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(
      `Invalid environment configuration:\n${problems.map((line) => `  - ${line}`).join("\n")}`,
    );
    this.name = "EnvValidationError";
  }
}

/**
 * Reads and validates the environment once, at startup. Fails fast with every
 * problem listed so a deploy never half-boots with a missing secret.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): BotEnv {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new EnvValidationError(problems);
}
