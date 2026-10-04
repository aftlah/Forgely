import { describe, expect, it, vi } from "vitest";

import { DiscordApiError } from "@forgely/shared";

import {
  fetchDiscordGuilds,
  filterManageableGuilds,
  getGuildIconUrl,
  parseDiscordGuilds,
  type DiscordGuild,
} from "./discord-guilds";

const MANAGE_GUILD = String(1 << 5);
const ADMINISTRATOR = String(1 << 3);
const SEND_MESSAGES = String(1 << 11);

function guild(overrides: Partial<DiscordGuild> = {}): DiscordGuild {
  return {
    id: "869020525853311026",
    name: "Test Server",
    icon: null,
    owner: false,
    permissions: SEND_MESSAGES,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("filterManageableGuilds", () => {
  it("keeps owners, Manage Server holders, and administrators", () => {
    const guilds = [
      guild({ id: "111111111111111111", owner: true }),
      guild({ id: "222222222222222222", permissions: MANAGE_GUILD }),
      guild({ id: "333333333333333333", permissions: ADMINISTRATOR }),
    ];

    expect(filterManageableGuilds(guilds)).toHaveLength(3);
  });

  it("drops servers where the user cannot manage anything", () => {
    expect(filterManageableGuilds([guild({ permissions: SEND_MESSAGES })])).toEqual([]);
  });
});

describe("parseDiscordGuilds", () => {
  it("accepts Discord's shape", () => {
    expect(parseDiscordGuilds([guild()])).toHaveLength(1);
  });

  it("rejects a malformed payload with a typed error", () => {
    expect(() => parseDiscordGuilds([{ id: "not-a-snowflake" }])).toThrow(DiscordApiError);
    expect(() => parseDiscordGuilds({ message: "nope" })).toThrow(DiscordApiError);
  });
});

describe("fetchDiscordGuilds", () => {
  const options = { accessToken: "token", apiBaseUrl: "https://discord.test/api" };

  it("sends the bearer token and returns the parsed guilds", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([guild()]));

    const result = await fetchDiscordGuilds({ ...options, fetchImpl });

    expect(result).toEqual({ status: "ok", guilds: [guild()] });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://discord.test/api/users/@me/guilds",
      expect.objectContaining({ headers: { authorization: "Bearer token" } }),
    );
  });

  it("reports an expired or revoked token instead of throwing", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "401: Unauthorized" }, 401));

    expect(await fetchDiscordGuilds({ ...options, fetchImpl })).toEqual({ status: "unauthorized" });
  });

  it("throws a typed error for rate limits and server errors", async () => {
    const rateLimited = vi.fn(async () => jsonResponse({}, 429));
    const broken = vi.fn(async () => jsonResponse({}, 503));

    await expect(fetchDiscordGuilds({ ...options, fetchImpl: rateLimited })).rejects.toThrow(
      DiscordApiError,
    );
    await expect(fetchDiscordGuilds({ ...options, fetchImpl: broken })).rejects.toThrow(
      DiscordApiError,
    );
  });
});

describe("getGuildIconUrl", () => {
  it("builds the CDN URL, and returns null for servers without an icon", () => {
    expect(getGuildIconUrl(guild({ icon: "abc" }))).toBe(
      "https://cdn.discordapp.com/icons/869020525853311026/abc.png?size=64",
    );
    expect(getGuildIconUrl(guild({ icon: null }))).toBeNull();
  });
});
