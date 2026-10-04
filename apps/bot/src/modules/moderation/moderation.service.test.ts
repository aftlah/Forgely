import { describe, expect, it, vi } from "vitest";

import { NotFoundError, PermissionError, ValidationError } from "@forgely/shared";

import { createSilentLogger } from "../../testing/silent-logger";

import type { ModerationRepository, NewModCase } from "./moderation.repository";
import { createModerationService, DEFAULT_REASON } from "./moderation.service";
import type { ModerationApi, ModerationContext, ModerationParty } from "./moderation.types";

const GUILD_ID = "111111111111111111";
const ACTOR_ID = "222222222222222222";
const TARGET_ID = "333333333333333333";
const MOD_LOG_ID = "444444444444444444";
const CHANNEL_ID = "555555555555555555";

function party(id: string, highestRolePosition: number): ModerationParty {
  return { id, highestRolePosition, isOwner: false };
}

function setup(options: { notifyUserByDm?: boolean; modLogChannelId?: string | null } = {}) {
  const calls: string[] = [];
  const track = <T>(name: string, result: T) =>
    vi.fn(async () => {
      calls.push(name);
      return result;
    });

  const api = {
    guildName: "Forge",
    getMember: vi.fn(async () => party(TARGET_ID, 1)),
    ban: track("ban", undefined),
    kick: track("kick", undefined),
    timeout: track("timeout", undefined),
    sendDm: track("dm", true),
    postToChannel: track("modlog", undefined),
    purge: vi.fn(async () => 3),
  } satisfies ModerationApi;

  const created: NewModCase[] = [];
  const repository: ModerationRepository = {
    createCase: vi.fn(async (input) => {
      calls.push("case");
      created.push(input);
      return { id: "id", caseNumber: created.length, createdAt: new Date(), ...input };
    }),
    listCasesForTarget: vi.fn(async () => []),
  };

  const context: ModerationContext = {
    api,
    config: {
      modLogChannelId: options.modLogChannelId === undefined ? MOD_LOG_ID : options.modLogChannelId,
      notifyUserByDm: options.notifyUserByDm ?? true,
    },
    guildId: GUILD_ID,
    actor: party(ACTOR_ID, 5),
    bot: party("botbotbotbotbotbot", 10),
    logger: createSilentLogger(),
  };

  return {
    api,
    repository,
    context,
    calls,
    created,
    service: createModerationService({ repository }),
  };
}

describe("ban", () => {
  it("DMs first, then bans, records the case, and posts to the mod log", async () => {
    const { service, context, calls, api, created } = setup();

    const result = await service.ban({
      context,
      targetId: TARGET_ID,
      reason: "spam",
      deleteMessageDays: 1,
    });

    expect(calls).toEqual(["dm", "ban", "case", "modlog"]);
    expect(api.ban).toHaveBeenCalledWith(TARGET_ID, `[${ACTOR_ID}] spam`, 86_400);
    expect(created[0]).toMatchObject({ type: "ban", targetId: TARGET_ID, moderatorId: ACTOR_ID });
    expect(result.dmStatus).toBe("sent");
  });

  it("uses a default reason when none is given", async () => {
    const { service, context, created } = setup();

    await service.ban({ context, targetId: TARGET_ID, deleteMessageDays: 0 });

    expect(created[0]?.reason).toBe(DEFAULT_REASON);
  });

  it("can ban someone who already left the server", async () => {
    const { service, context, api } = setup();
    api.getMember.mockResolvedValue(null as never);

    await service.ban({ context, targetId: TARGET_ID, deleteMessageDays: 0 });

    expect(api.ban).toHaveBeenCalled();
  });

  it("refuses a target the actor does not outrank, without acting or recording", async () => {
    const { service, context, api, created } = setup();
    api.getMember.mockResolvedValue(party(TARGET_ID, 5));

    await expect(
      service.ban({ context, targetId: TARGET_ID, deleteMessageDays: 0 }),
    ).rejects.toThrow(PermissionError);

    expect(api.sendDm).not.toHaveBeenCalled();
    expect(api.ban).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);
  });

  it("records nothing when Discord rejects the ban", async () => {
    const { service, context, api, created } = setup();
    api.ban.mockRejectedValue(new Error("Missing Permissions"));

    await expect(
      service.ban({ context, targetId: TARGET_ID, deleteMessageDays: 0 }),
    ).rejects.toThrow("Missing Permissions");

    expect(created).toHaveLength(0);
  });
});

describe("notifications and mod log", () => {
  it("still completes when the DM cannot be delivered", async () => {
    const { service, context, api, created } = setup();
    api.sendDm.mockResolvedValue(false);

    const result = await service.kick({ context, targetId: TARGET_ID });

    expect(result.dmStatus).toBe("failed");
    expect(created).toHaveLength(1);
  });

  it("skips the DM when notifications are off", async () => {
    const { service, context, api } = setup({ notifyUserByDm: false });

    const result = await service.kick({ context, targetId: TARGET_ID });

    expect(api.sendDm).not.toHaveBeenCalled();
    expect(result.dmStatus).toBe("disabled");
  });

  it("does not fail the command when the mod-log post fails", async () => {
    const { service, context, api } = setup();
    api.postToChannel.mockRejectedValue(new Error("Unknown Channel"));

    await expect(service.kick({ context, targetId: TARGET_ID })).resolves.toBeDefined();
  });

  it("does not post when no mod-log channel is configured", async () => {
    const { service, context, api } = setup({ modLogChannelId: null });

    await service.kick({ context, targetId: TARGET_ID });

    expect(api.postToChannel).not.toHaveBeenCalled();
  });
});

describe("kick, timeout, and warn", () => {
  it("rejects a kick for someone who is not in the server", async () => {
    const { service, context, api } = setup();
    api.getMember.mockResolvedValue(null as never);

    await expect(service.kick({ context, targetId: TARGET_ID })).rejects.toThrow(NotFoundError);
    expect(api.kick).not.toHaveBeenCalled();
  });

  it("times out, records the duration, and DMs after the action", async () => {
    const { service, context, calls, created } = setup();

    await service.timeout({ context, targetId: TARGET_ID, durationMs: 90 * 60_000 });

    expect(calls).toEqual(["timeout", "case", "dm", "modlog"]);
    expect(created[0]).toMatchObject({ type: "timeout", durationSeconds: 5400 });
  });

  it("records a warning without touching the member", async () => {
    const { service, context, api, created } = setup();

    await service.warn({ context, targetId: TARGET_ID, reason: "be nice" });

    expect(created[0]).toMatchObject({ type: "warn", reason: "be nice" });
    expect(api.ban).not.toHaveBeenCalled();
    expect(api.kick).not.toHaveBeenCalled();
    expect(api.timeout).not.toHaveBeenCalled();
  });

  it("refuses to moderate yourself", async () => {
    const { service, context } = setup();

    await expect(service.warn({ context, targetId: ACTOR_ID })).rejects.toThrow(PermissionError);
  });
});

describe("purge", () => {
  it.each([0, -1, 101, 1.5])("rejects an amount of %s", async (amount) => {
    const { service, context, api } = setup();

    await expect(service.purge({ context, channelId: CHANNEL_ID, amount })).rejects.toThrow(
      ValidationError,
    );
    expect(api.purge).not.toHaveBeenCalled();
  });

  it("records a case describing what was deleted", async () => {
    const { service, context, created } = setup();

    const result = await service.purge({
      context,
      channelId: CHANNEL_ID,
      amount: 5,
      onlyFromUserId: TARGET_ID,
    });

    expect(result.deletedCount).toBe(3);
    expect(created[0]).toMatchObject({ type: "purge", targetId: TARGET_ID });
    expect(created[0]?.reason).toContain("Purged 3 message(s)");
  });

  it("records nothing when no messages were deleted", async () => {
    const { service, context, api, created } = setup();
    api.purge.mockResolvedValue(0);

    const result = await service.purge({ context, channelId: CHANNEL_ID, amount: 5 });

    expect(result.moderationCase).toBeUndefined();
    expect(created).toHaveLength(0);
  });
});
