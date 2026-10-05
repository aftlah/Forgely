import { describe, expect, it } from "vitest";

import { getBuilderEnv, getMissingAuthEnv, getServerEnv, isBuilderConfigured } from "./env";

const valid = {
  AUTH_SECRET: "x".repeat(32),
  AUTH_DISCORD_ID: "1556267228515794964",
  AUTH_DISCORD_SECRET: "secret",
  DATABASE_URL: "postgres://forgely:forgely@localhost:54320/forgely",
};

describe("getServerEnv", () => {
  it("accepts a complete environment and defaults the Discord API URL", () => {
    expect(getServerEnv(valid).DISCORD_API_BASE_URL).toBe("https://discord.com/api/v10");
  });

  it("rejects a short AUTH_SECRET", () => {
    expect(() => getServerEnv({ ...valid, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("lists every problem at once", () => {
    expect(() => getServerEnv({})).toThrow(/AUTH_DISCORD_SECRET[\s\S]*DATABASE_URL/);
  });
});

describe("getMissingAuthEnv", () => {
  it("names only the missing or empty sign-in variables", () => {
    expect(getMissingAuthEnv({ AUTH_SECRET: "x", AUTH_DISCORD_ID: "", DATABASE_URL: "u" })).toEqual(
      ["AUTH_DISCORD_ID", "AUTH_DISCORD_SECRET"],
    );
  });

  it("is empty when everything is set", () => {
    expect(getMissingAuthEnv(valid)).toEqual([]);
  });
});

describe("getBuilderEnv", () => {
  it("needs an API key and defaults the model names", () => {
    const env = getBuilderEnv({ GEMINI_API_KEY: "key" });
    expect(env.GEMINI_MODEL).toBe("gemini-3.5-flash");
    expect(env.GEMINI_FALLBACK_MODEL).toBe("gemini-3.5-flash-lite");
    expect(env.GEMINI_API_BASE_URL).toBeUndefined();
  });

  it("treats empty strings as unset", () => {
    expect(getBuilderEnv({ GEMINI_API_KEY: "key", GEMINI_MODEL: "" }).GEMINI_MODEL).toBe(
      "gemini-3.5-flash",
    );
  });

  it("reports whether the builder is configured without throwing", () => {
    expect(isBuilderConfigured({})).toBe(false);
    expect(isBuilderConfigured({ GEMINI_API_KEY: "key" })).toBe(true);
    expect(() => getBuilderEnv({})).toThrow(/GEMINI_API_KEY/);
  });
});
