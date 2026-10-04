import { describe, expect, it } from "vitest";

import { getMissingAuthEnv, getServerEnv } from "./env";

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
