import { describe, expect, it, vi } from "vitest";

import { DiscordApiError } from "@forgely/shared";

import { fetchGuildResources, toChannelOptions, toRoleOptions } from "./guild-resources";

const GUILD = "869020525853311026";
const BOT = "1556267228515794964";

function role(
  id: string,
  name: string,
  position: number,
  extra: { managed?: boolean; color?: number } = {},
) {
  return { id, name, position, managed: extra.managed ?? false, color: extra.color ?? 0 };
}

describe("toChannelOptions", () => {
  it("keeps only text and announcement channels, in Discord's order", () => {
    const channels = [
      { id: "100000000000000001", name: "voice", type: 2, position: 0 },
      { id: "100000000000000002", name: "rules", type: 0, position: 2 },
      { id: "100000000000000003", name: "category", type: 4, position: 1 },
      { id: "100000000000000004", name: "news", type: 5, position: 1 },
    ];

    expect(toChannelOptions(channels).map((channel) => channel.name)).toEqual(["news", "rules"]);
  });
});

describe("toRoleOptions", () => {
  const roles = [
    role(GUILD, "@everyone", 0),
    role("200000000000000001", "Member", 1),
    role("200000000000000002", "Mod", 5),
    role("200000000000000003", "Forgely", 4, { managed: true }),
    role("200000000000000004", "Booster", 2, { managed: true }),
  ];
  const botRoleIds = ["200000000000000003"];

  it("leaves out @everyone", () => {
    expect(toRoleOptions(roles, GUILD, botRoleIds).some((option) => option.id === GUILD)).toBe(
      false,
    );
  });

  it("marks roles below the bot's top role as assignable", () => {
    const member = toRoleOptions(roles, GUILD, botRoleIds).find(
      (option) => option.name === "Member",
    );
    expect(member?.isAssignable).toBe(true);
  });

  it("marks roles above the bot's top role, and integration-managed roles, as not assignable", () => {
    const options = toRoleOptions(roles, GUILD, botRoleIds);
    expect(options.find((option) => option.name === "Mod")?.isAssignable).toBe(false);
    expect(options.find((option) => option.name === "Booster")?.isAssignable).toBe(false);
  });

  it("says why a role is unavailable: managed by an integration, or above the bot", () => {
    const options = toRoleOptions(roles, GUILD, botRoleIds);

    expect(options.find((option) => option.name === "Booster")?.unavailableReason).toBe("managed");
    expect(options.find((option) => option.name === "Mod")?.unavailableReason).toBe("above-bot");
    expect(options.find((option) => option.name === "Member")?.unavailableReason).toBeNull();
  });

  it("treats every role as unassignable when the bot has no role of its own", () => {
    const options = toRoleOptions(roles, GUILD, []);
    expect(options.every((option) => !option.isAssignable)).toBe(true);
  });

  it("converts Discord's integer color to CSS, and a missing color to null", () => {
    const colored = toRoleOptions(
      [role(GUILD, "@everyone", 0), role("200000000000000009", "Red", 1, { color: 0xff0000 })],
      GUILD,
      [],
    );
    expect(colored[0]?.color).toBe("#ff0000");
    expect(
      toRoleOptions(roles, GUILD, botRoleIds).find((option) => option.name === "Member")?.color,
    ).toBeNull();
  });
});

describe("fetchGuildResources", () => {
  const options = {
    guildId: GUILD,
    botToken: "bot-token",
    botUserId: BOT,
    apiBaseUrl: "https://discord.test/api",
  };

  function fakeDiscord(overrides: Partial<Record<string, Response>> = {}) {
    return vi.fn(async (url: string | URL | Request) => {
      const path = new URL(String(url)).pathname;
      const found = Object.entries(overrides).find(([suffix]) => path.endsWith(suffix));
      if (found?.[1]) return found[1];
      if (path.endsWith("/channels"))
        return Response.json([{ id: "100000000000000002", name: "rules", type: 0, position: 0 }]);
      if (path.endsWith("/roles"))
        return Response.json([
          role(GUILD, "@everyone", 0),
          role("200000000000000001", "Member", 1),
        ]);
      return Response.json({ roles: ["200000000000000001"] });
    });
  }

  it("authenticates as the bot and returns parsed channels and roles", async () => {
    const fetchImpl = fakeDiscord();

    const resources = await fetchGuildResources({ ...options, fetchImpl });

    expect(resources.channels).toEqual([{ id: "100000000000000002", name: "rules" }]);
    expect(resources.roles).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { authorization: "Bot bot-token" } }),
    );
  });

  it("throws a typed error when Discord refuses (for example the bot lacks access)", async () => {
    const fetchImpl = fakeDiscord({ "/channels": new Response("{}", { status: 403 }) });

    await expect(fetchGuildResources({ ...options, fetchImpl })).rejects.toThrow(DiscordApiError);
  });

  it("throws a typed error when Discord answers in an unexpected shape", async () => {
    const fetchImpl = fakeDiscord({ "/roles": Response.json({ not: "a list" }) });

    await expect(fetchGuildResources({ ...options, fetchImpl })).rejects.toThrow(DiscordApiError);
  });
});
