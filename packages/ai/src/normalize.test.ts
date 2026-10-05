import { describe, expect, it } from "vitest";

import { cleanName, normalizePlan, toChannelSlug } from "./normalize";
import type { ServerPlan } from "./plan";

const plan = (overrides: Partial<ServerPlan> = {}): ServerPlan => ({
  summary: "A plan",
  deletions: [],
  roles: [],
  categories: [
    {
      name: "General",
      channels: [
        { name: "general", kind: "text", topic: null, access: "public", allowedRoleKeys: [] },
      ],
    },
  ],
  ...overrides,
});

describe("cleanName", () => {
  it("removes mentions, markup, and control characters", () => {
    expect(cleanName("  @everyone <@123456789012345678> **Hi**\n there ")).toBe(
      "everyone Hi there",
    );
  });

  it("caps the length", () => {
    expect(cleanName("a".repeat(500))).toHaveLength(100);
  });
});

describe("toChannelSlug", () => {
  it("lowercases and dashes like Discord does", () => {
    expect(toChannelSlug("  Looking For  Team!! ")).toBe("looking-for-team");
  });

  it("keeps non-Latin letters", () => {
    expect(toChannelSlug("Diskusi Umum")).toBe("diskusi-umum");
    expect(toChannelSlug("общий чат")).toBe("общий-чат");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(toChannelSlug("!!!")).toBe("");
  });
});

describe("normalizePlan", () => {
  it("slugs text channels but keeps voice channel names readable", () => {
    const result = normalizePlan(
      plan({
        categories: [
          {
            name: "Hang out",
            channels: [
              {
                name: "Game Chat",
                kind: "text",
                topic: " Talk @everyone ",
                access: "public",
                allowedRoleKeys: [],
              },
              {
                name: "Game Voice",
                kind: "voice",
                topic: null,
                access: "public",
                allowedRoleKeys: [],
              },
            ],
          },
        ],
      }),
    );
    const channels = result.categories[0]?.channels ?? [];
    expect(channels.map((channel) => channel.name)).toEqual(["game-chat", "Game Voice"]);
    expect(channels[0]?.topic).toBe("Talk everyone");
  });

  it("never lets a role be called everyone or here", () => {
    const result = normalizePlan(
      plan({
        roles: [
          { key: "a", name: "@everyone", color: "#FF0000", isHoisted: false },
          { key: "b", name: "here", color: null, isHoisted: true },
        ],
      }),
    );
    expect(result.roles.map((role) => role.name)).toEqual(["everyone members", "here members"]);
    expect(result.roles[0]?.color).toBe("#ff0000");
  });

  it("falls back to a placeholder when a name is only markup", () => {
    const result = normalizePlan(
      plan({
        categories: [
          {
            name: "@@@",
            channels: [
              { name: "???", kind: "text", topic: null, access: "public", allowedRoleKeys: [] },
            ],
          },
        ],
      }),
    );
    expect(result.categories[0]?.name).toBe("New category");
    expect(result.categories[0]?.channels[0]?.name).toBe("new-channel");
  });
});

describe("normalizePlan summary", () => {
  it("keeps a summary longer than a name, up to the summary limit", () => {
    const summary = "Set up a new category with channels and a role. ".repeat(5).trim();
    expect(summary.length).toBeGreaterThan(100);
    expect(normalizePlan(plan({ summary })).summary).toBe(summary);
  });

  it("still cleans markup and caps the summary", () => {
    const long = `@everyone ${"x".repeat(400)}`;
    const result = normalizePlan(plan({ summary: long })).summary;
    expect(result.startsWith("everyone")).toBe(true);
    expect(result.length).toBe(300);
  });
});
