import { describe, expect, it, vi } from "vitest";

import type { CreationPlan, PlanChannel } from "@forgely/ai";

import { applyCreationPlan } from "./apply-plan";
import { CHANNEL_TYPE } from "./server-state";

import type { DiscordGuildRest, NewChannel } from "@/lib/discord-guild-rest";
import { DiscordRestError } from "@/lib/discord-transport";

const GUILD = "869020525853311026";
const BOT = "1556267228515794964";
const EXISTING_ROLE = "200000000000000009";
const EXISTING_CATEGORY = "300000000000000009";

const channel = (name: string, patch: Partial<PlanChannel> = {}): PlanChannel => ({
  name,
  kind: "text",
  topic: null,
  access: "public",
  allowedRoleKeys: [],
  ...patch,
});

function fakeRest(overrides: Partial<DiscordGuildRest> = {}) {
  let next = 1;
  const created: { kind: "role" | "channel"; body: unknown }[] = [];
  const rest: DiscordGuildRest = {
    listChannels: vi.fn(),
    listRoles: vi.fn(),
    listSpecialChannelIds: vi.fn(async () => []),
    deleteChannel: vi.fn(async () => undefined),
    deleteRole: vi.fn(async () => undefined),
    putOverwrite: vi.fn(async () => undefined),
    deleteOverwrite: vi.fn(async () => undefined),
    createRole: vi.fn(async (_guild, role) => {
      created.push({ kind: "role", body: role });
      return { id: `4000000000000000${next++}`.padEnd(18, "0").slice(0, 18) };
    }),
    createChannel: vi.fn(async (_guild, body) => {
      created.push({ kind: "channel", body });
      return { id: `5000000000000000${next++}`.padEnd(18, "0").slice(0, 18) };
    }),
    ...overrides,
  };
  const state = {
    snapshot: { roles: [], categories: [] },
    roles: [{ id: EXISTING_ROLE, name: "Coach" }],
    channels: [
      { id: EXISTING_CATEGORY, name: "Info", type: CHANNEL_TYPE.category, parent_id: null },
    ],
  };
  const apply = (creation: CreationPlan) =>
    applyCreationPlan({ rest, guildId: GUILD, botUserId: BOT, state }, creation);
  return { rest, created, apply };
}

const PLAN: CreationPlan = {
  deletions: [],
  accessChanges: [],
  newRoles: [{ key: "member", name: "Member", color: "#3498db", isHoisted: true }],
  existingRoles: [{ key: "coach", name: "Coach" }],
  categories: [
    {
      name: "Club",
      isNew: true,
      channels: [channel("chat"), channel("rules", { access: "read-only" })],
    },
    { name: "Info", isNew: false, channels: [channel("news")] },
    {
      name: "Staff",
      isNew: true,
      channels: [channel("coaches", { access: "private", allowedRoleKeys: ["coach", "member"] })],
    },
  ],
};

describe("applyCreationPlan", () => {
  it("creates roles first, then categories, then channels inside them", async () => {
    const { created, apply } = fakeRest();
    const result = await apply(PLAN);
    const kinds = created.map((entry) =>
      entry.kind === "role" ? "role" : (entry.body as NewChannel).name,
    );
    expect(kinds).toEqual(["role", "Club", "chat", "rules", "news", "Staff", "coaches"]);
    expect(result.failedCount).toBe(0);
    expect(result.createdCount).toBe(7);
  });

  it("converts the color and puts channels in the right category", async () => {
    const { created, apply } = fakeRest();
    await apply(PLAN);
    expect(created[0]?.body).toMatchObject({ name: "Member", color: 0x3498db, hoist: true });
    const news = created.find((entry) => (entry.body as NewChannel).name === "news")
      ?.body as NewChannel;
    expect(news.parent_id).toBe(EXISTING_CATEGORY);
  });

  it("hides a private channel from everyone and lets the listed roles in", async () => {
    const { created, apply } = fakeRest();
    await apply(PLAN);
    const coaches = created.find((entry) => (entry.body as NewChannel).name === "coaches")
      ?.body as NewChannel;
    const overwrites = coaches.permission_overwrites ?? [];
    expect(overwrites.find((entry) => entry.id === GUILD)?.deny).toBe(String(1n << 10n));
    expect(overwrites.some((entry) => entry.id === EXISTING_ROLE)).toBe(true);
    expect(overwrites.some((entry) => entry.id === BOT && entry.type === 1)).toBe(true);
  });

  it("never grants more than seeing and talking in a channel", async () => {
    const { created, apply } = fakeRest();
    await apply(PLAN);
    const ADMINISTRATOR = 1n << 3n;
    const everyBit = created.flatMap((entry) =>
      ((entry.body as NewChannel).permission_overwrites ?? []).flatMap((item) => [
        BigInt(item.allow),
        BigInt(item.deny),
      ]),
    );
    expect(everyBit.every((bits) => (bits & ADMINISTRATOR) === 0n)).toBe(true);
  });

  it("falls back to a text channel when the server is not a Community server", async () => {
    let calls = 0;
    const { apply } = fakeRest({
      createChannel: vi.fn(async (_guild, body) => {
        calls += 1;
        if (body.type === CHANNEL_TYPE.announcement) throw new DiscordRestError(400, 50024, "no");
        return { id: "500000000000000001" };
      }),
    });
    const result = await apply({
      newRoles: [],
      deletions: [],
      accessChanges: [],
      existingRoles: [],
      categories: [
        { name: "Info", isNew: false, channels: [channel("news", { kind: "announcement" })] },
      ],
    });
    expect(result.items).toEqual([{ kind: "channel", name: "news", outcome: "created-as-text" }]);
    expect(calls).toBe(2);
  });

  it("records a failed item and keeps going with the rest", async () => {
    const { apply } = fakeRest({
      createChannel: vi.fn(async (_guild, body) => {
        if (body.name === "chat") throw new DiscordRestError(400, undefined, "bad");
        return { id: "500000000000000001" };
      }),
    });
    const result = await apply({
      newRoles: [],
      deletions: [],
      accessChanges: [],
      existingRoles: [],
      categories: [{ name: "Info", isNew: false, channels: [channel("chat"), channel("news")] }],
    });
    expect(result.items.map((item) => item.outcome)).toEqual(["failed", "created"]);
  });

  it("stops after a refused permission instead of failing every item", async () => {
    const createChannel = vi.fn(async () => {
      throw new DiscordRestError(403, 50013, "no");
    });
    const { apply } = fakeRest({ createChannel });
    const result = await apply({
      newRoles: [],
      deletions: [],
      accessChanges: [],
      existingRoles: [],
      categories: [
        { name: "Info", isNew: false, channels: [channel("a"), channel("b"), channel("c")] },
      ],
    });
    expect(createChannel).toHaveBeenCalledTimes(1);
    expect(result.items.map((item) => item.outcome)).toEqual(["failed", "skipped", "skipped"]);
    expect(result.items[0]?.message).toContain("Manage Roles");
  });

  it("skips a private channel when its role could not be created", async () => {
    const { apply } = fakeRest({
      createRole: vi.fn(async () => {
        throw new DiscordRestError(400, undefined, "bad");
      }),
    });
    const result = await apply({
      newRoles: [{ key: "vip", name: "VIP", color: null, isHoisted: false }],
      deletions: [],
      accessChanges: [],
      existingRoles: [],
      categories: [
        {
          name: "Info",
          isNew: false,
          channels: [channel("vip", { access: "private", allowedRoleKeys: ["vip"] })],
        },
      ],
    });
    expect(result.items.map((item) => item.outcome)).toEqual(["failed", "skipped"]);
  });

  it("skips channels whose new category could not be created", async () => {
    const { apply } = fakeRest({
      createChannel: vi.fn(async () => {
        throw new DiscordRestError(400, undefined, "bad");
      }),
    });
    const result = await apply({
      newRoles: [],
      deletions: [],
      accessChanges: [],
      existingRoles: [],
      categories: [{ name: "New", isNew: true, channels: [channel("a")] }],
    });
    expect(result.items.map((item) => `${item.kind}:${item.outcome}`)).toEqual([
      "category:failed",
      "channel:skipped",
    ]);
  });

  describe("deletions", () => {
    const empty: CreationPlan = {
      newRoles: [],
      existingRoles: [],
      categories: [],
      deletions: [],
      accessChanges: [],
    };
    const deletions: CreationPlan["deletions"] = [
      { kind: "role", id: "700000000000000001", name: "Old role" },
      { kind: "category", id: "600000000000000002", name: "Old" },
      { kind: "channel", id: "600000000000000001", name: "old-chat" },
    ];

    it("removes channels, then categories, then roles", async () => {
      const calls: string[] = [];
      const { apply } = fakeRest({
        deleteChannel: vi.fn(async (id) => void calls.push(`channel:${id}`)),
        deleteRole: vi.fn(async (_guild, id) => void calls.push(`role:${id}`)),
      });
      const result = await apply({ ...empty, deletions });
      expect(calls).toEqual([
        "channel:600000000000000001",
        "channel:600000000000000002",
        "role:700000000000000001",
      ]);
      expect(result).toMatchObject({ deletedCount: 3, failedCount: 0 });
    });

    it("keeps going after a refusal and says why", async () => {
      const { apply } = fakeRest({
        deleteChannel: vi.fn(async (id) => {
          if (id.endsWith("1")) throw new DiscordRestError(403, 50013, "no");
        }),
      });
      const result = await apply({ ...empty, deletions });
      expect(result.deletedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.items.find((item) => item.outcome === "failed")?.message).toContain(
        "not allowed",
      );
    });

    it("treats an already-deleted item as skipped, not failed-by-error", async () => {
      const { apply } = fakeRest({
        deleteChannel: vi.fn(async () => {
          throw new DiscordRestError(404, 10003, "gone");
        }),
      });
      const result = await apply({ ...empty, deletions: [deletions[2]!] });
      expect(result.items[0]).toMatchObject({
        outcome: "skipped",
        message: "It was already gone.",
      });
    });

    it("creates first, so a failed creation never costs the person something they had", async () => {
      const order: string[] = [];
      const { apply } = fakeRest({
        createRole: vi.fn(async () => {
          order.push("create");
          return { id: "400000000000000001" };
        }),
        deleteChannel: vi.fn(async () => void order.push("delete")),
      });
      await apply({
        ...empty,
        newRoles: [{ key: "a", name: "A", color: null, isHoisted: false }],
        deletions: [deletions[2]!],
      });
      expect(order).toEqual(["create", "delete"]);
    });
  });
});
