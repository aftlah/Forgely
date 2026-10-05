import { describe, expect, it, vi } from "vitest";

import type { ServerPlan } from "@forgely/ai";
import type { BuilderRunRepository } from "@forgely/db";

import { applyBuilderPlan } from "./apply-builder-plan";
import { CHANNEL_TYPE } from "./server-state";

import type { DiscordGuildRest } from "@/lib/discord-guild-rest";

const GUILD = "869020525853311026";
const ACTOR = "345934416490528778";
const BOT = "1556267228515794964";

const PLAN: ServerPlan = {
  summary: "Club",
  deletions: [],
  roles: [{ key: "member", name: "Member", color: null, isHoisted: false }],
  categories: [
    {
      name: "Club",
      channels: [
        { name: "chat", kind: "text", topic: null, access: "public", allowedRoleKeys: [] },
        { name: "news", kind: "text", topic: null, access: "public", allowedRoleKeys: [] },
      ],
    },
  ],
};

function setup(
  options: {
    plan?: unknown;
    claim?: boolean;
    channels?: { id: string; name: string; type: number; parent_id: string | null }[];
    roles?: { id: string; name: string; managed?: boolean }[];
    special?: string[];
    found?: boolean;
  } = {},
) {
  const runs = {
    findForGuild: vi.fn(async () =>
      options.found === false ? null : { id: "run-1", plan: options.plan ?? PLAN },
    ),
    claimForApply: vi.fn(async () => options.claim ?? true),
    finishWithAudit: vi.fn(async () => undefined),
  } as unknown as BuilderRunRepository;
  const rest: DiscordGuildRest = {
    listChannels: vi.fn(async () => options.channels ?? []),
    listRoles: vi.fn(async () => options.roles ?? []),
    createRole: vi.fn(async () => ({ id: "400000000000000001" })),
    createChannel: vi.fn(async () => ({ id: "500000000000000001" })),
    listSpecialChannelIds: vi.fn(async () => options.special ?? []),
    deleteChannel: vi.fn(async () => undefined),
    deleteRole: vi.fn(async () => undefined),
  };
  const run = (excluded: string[] = [], deleteIds: string[] = []) =>
    applyBuilderPlan(
      { rest, runs, botUserId: BOT },
      {
        guildId: GUILD,
        actorId: ACTOR,
        runId: "run-1",
        excludedIds: new Set(excluded),
        deleteIds: new Set(deleteIds),
      },
    );
  return { run, runs, rest };
}

describe("applyBuilderPlan", () => {
  it("creates the plan, records the run as applied, and audits it", async () => {
    const { run, runs, rest } = setup();
    const outcome = await run();
    expect(outcome).toMatchObject({ ok: true, result: { createdCount: 4, failedCount: 0 } });
    expect(rest.createRole).toHaveBeenCalledTimes(1);
    expect(rest.createChannel).toHaveBeenCalledTimes(3);
    expect(runs.finishWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "applied", actorId: ACTOR, guildId: GUILD }),
    );
  });

  it("honors what the user unticked", async () => {
    const { run, rest } = setup();
    await run(["c0.1", "member"]);
    expect(rest.createRole).not.toHaveBeenCalled();
    expect(rest.createChannel).toHaveBeenCalledTimes(2);
  });

  it("does not duplicate what already exists on the server", async () => {
    const { run, rest } = setup({
      channels: [
        { id: "300000000000000001", name: "Club", type: CHANNEL_TYPE.category, parent_id: null },
        {
          id: "300000000000000002",
          name: "chat",
          type: CHANNEL_TYPE.text,
          parent_id: "300000000000000001",
        },
      ],
    });
    await run();
    expect(rest.createChannel).toHaveBeenCalledTimes(1);
    expect(rest.createChannel).toHaveBeenCalledWith(
      GUILD,
      expect.objectContaining({ name: "news", parent_id: "300000000000000001" }),
    );
  });

  it("refuses a plan it cannot find, or one that no longer validates", async () => {
    expect(await setup({ found: false }).run()).toMatchObject({ ok: false });
    expect(await setup({ plan: { nope: true } }).run()).toMatchObject({ ok: false });
  });

  it("applies a plan only once", async () => {
    const { run, rest } = setup({ claim: false });
    const outcome = await run();
    expect(outcome).toEqual({ ok: false, message: expect.stringContaining("already applied") });
    expect(rest.createChannel).not.toHaveBeenCalled();
  });

  it("says so when the choices leave nothing to create", async () => {
    const { run, runs } = setup();
    const outcome = await run(["member", "c0"]);
    expect(outcome).toEqual({ ok: false, message: expect.stringContaining("nothing to create") });
    expect(runs.claimForApply).not.toHaveBeenCalled();
  });

  it("refuses to go over Discord's channel limit before changing anything", async () => {
    const channels = Array.from({ length: 499 }, (_, index) => ({
      id: `3000000000000${String(index).padStart(5, "0")}`,
      name: `c${index}`,
      type: CHANNEL_TYPE.text,
      parent_id: null,
    }));
    const { run, rest, runs } = setup({ channels });
    const outcome = await run();
    expect(outcome).toEqual({ ok: false, message: expect.stringContaining("limit of 500") });
    expect(rest.createChannel).not.toHaveBeenCalled();
    expect(runs.claimForApply).not.toHaveBeenCalled();
  });

  it("records a run where nothing could be created as failed", async () => {
    const { run, runs, rest } = setup();
    (rest.createRole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    (rest.createChannel as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const outcome = await run();
    expect(outcome).toMatchObject({ ok: true, result: { createdCount: 0 } });
    expect(runs.finishWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });

  describe("deletions", () => {
    const CHAT = "600000000000000001";
    const RULES = "600000000000000002";
    const OLD_ROLE = "700000000000000001";
    const channels = [
      { id: CHAT, name: "old-chat", type: 0, parent_id: null },
      { id: RULES, name: "rules", type: 0, parent_id: null },
    ];
    const roles = [{ id: OLD_ROLE, name: "Old role", managed: false }];
    const removal: ServerPlan = {
      summary: "Tidy up",
      roles: [],
      categories: [],
      deletions: [
        { kind: "channel", id: CHAT, name: "old-chat" },
        { kind: "channel", id: RULES, name: "rules" },
        { kind: "role", id: OLD_ROLE, name: "Old role" },
      ],
    };

    it("deletes nothing the person did not tick", async () => {
      const { run, rest } = setup({ plan: removal, channels, roles });
      const outcome = await run();
      expect(outcome).toEqual({
        ok: false,
        message: expect.stringContaining("nothing to create or delete"),
      });
      expect(rest.deleteChannel).not.toHaveBeenCalled();
      expect(rest.deleteRole).not.toHaveBeenCalled();
    });

    it("deletes exactly the ticked items and records them", async () => {
      const { run, runs, rest } = setup({ plan: removal, channels, roles });
      const outcome = await run([], [CHAT, OLD_ROLE]);
      expect(outcome).toMatchObject({ ok: true, result: { deletedCount: 2, failedCount: 0 } });
      expect(rest.deleteChannel).toHaveBeenCalledTimes(1);
      expect(rest.deleteChannel).toHaveBeenCalledWith(CHAT);
      expect(rest.deleteRole).toHaveBeenCalledWith(GUILD, OLD_ROLE);
      expect(rest.createChannel).not.toHaveBeenCalled();
      expect(runs.finishWithAudit).toHaveBeenCalledWith(
        expect.objectContaining({ status: "applied" }),
      );
    });

    it("refuses a channel Discord relies on, even when ticked", async () => {
      const { run, rest } = setup({ plan: removal, channels, roles, special: [RULES] });
      const outcome = await run([], [RULES]);
      expect(outcome).toMatchObject({ ok: false });
      expect(rest.deleteChannel).not.toHaveBeenCalled();
    });

    it("refuses a managed role, even when ticked", async () => {
      const managed = [{ id: OLD_ROLE, name: "Old role", managed: true }];
      const { run, rest } = setup({ plan: removal, channels, roles: managed });
      await run([], [OLD_ROLE]);
      expect(rest.deleteRole).not.toHaveBeenCalled();
    });

    it("refuses an item that was renamed after the plan was made", async () => {
      const renamed = [{ id: CHAT, name: "important-new-name", type: 0, parent_id: null }];
      const { run, rest } = setup({ plan: removal, channels: renamed, roles });
      await run([], [CHAT]);
      expect(rest.deleteChannel).not.toHaveBeenCalled();
    });

    it("ignores a ticked ID that is not in the plan", async () => {
      const { run, rest } = setup({ plan: removal, channels, roles });
      await run([], [CHAT, "999999999999999999"]);
      expect(rest.deleteChannel).toHaveBeenCalledTimes(1);
    });
  });
});
