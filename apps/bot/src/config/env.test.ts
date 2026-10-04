import { describe, expect, it } from "vitest";

import { EnvValidationError, loadEnv } from "./env";

const validEnv = {
  DISCORD_TOKEN: "token",
  DISCORD_CLIENT_ID: "123456789012345678",
  DATABASE_URL: "postgres://forgely:forgely@localhost:5432/forgely",
  REDIS_URL: "redis://localhost:6379",
};

describe("loadEnv", () => {
  it("applies defaults for optional values", () => {
    const env = loadEnv(validEnv);
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it("allows a missing REDIS_URL in development", () => {
    const { REDIS_URL: _omitted, ...withoutRedis } = validEnv;
    expect(loadEnv(withoutRedis).REDIS_URL).toBeUndefined();
  });

  it("requires REDIS_URL in production", () => {
    const { REDIS_URL: _omitted, ...withoutRedis } = validEnv;
    expect(() => loadEnv({ ...withoutRedis, NODE_ENV: "production" })).toThrow(/REDIS_URL/);
  });

  it("treats blank optional variables as unset", () => {
    const env = loadEnv({ ...validEnv, SENTRY_DSN: "", DISCORD_DEV_GUILD_ID: "" });
    expect(env.SENTRY_DSN).toBeUndefined();
    expect(env.DISCORD_DEV_GUILD_ID).toBeUndefined();
  });

  it("lists every problem when required values are missing or malformed", () => {
    const attempt = (): unknown =>
      loadEnv({ DISCORD_CLIENT_ID: "not-a-snowflake", REDIS_URL: "nope" });

    expect(attempt).toThrow(EnvValidationError);
    try {
      attempt();
    } catch (error) {
      const { problems } = error as EnvValidationError;
      expect(problems.join("\n")).toMatch(/DISCORD_TOKEN/);
      expect(problems.join("\n")).toMatch(/DISCORD_CLIENT_ID/);
      expect(problems.join("\n")).toMatch(/DATABASE_URL/);
      expect(problems.join("\n")).toMatch(/REDIS_URL/);
    }
  });
});
