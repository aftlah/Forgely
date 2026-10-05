import { describe, expect, it, vi } from "vitest";

import type { AccessChangeDiff } from "@forgely/ai";

import { applyAccessChange } from "./apply-access";
import { PERMISSION } from "./constants";
import type { ServerState } from "./server-state";

import type { DiscordGuildRest } from "@/lib/discord-guild-rest";
import { DiscordRestError } from "@/lib/discord-transport";

const GUILD = "869020525853311026";
const BOT = "111111111111111111";
const CHANNEL = "500000000000000001";
const STAFF = "200000000000000001";

const change: AccessChangeDiff = {
  id: CHANNEL,
  name: "rules",
  categoryName: "Info",
  kind: "text",
  from: "public",
  to: "private",
  roleKeys: ["staff"],
  roleNames: ["Staff"],
};

function setup(rest: Partial<DiscordGuildRest> = {}, overwrites: unknown[] = []) {
  const fake = {
    putOverwrite: vi.fn(async () => undefined),
    deleteOverwrite: vi.fn(async () => undefined),
    ...rest,
  } as unknown as DiscordGuildRest;
  const state = {
    channels: [{ id: CHANNEL, name: "rules", type: 0, permission_overwrites: overwrites }],
  } as unknown as ServerState;
  const run = (roles = new Map([["staff", STAFF]])) =>
    applyAccessChange({ rest: fake, guildId: GUILD, botUserId: BOT, state }, change, roles);
  return { fake, run };
}

describe("applyAccessChange", () => {
  it("hides the channel from @everyone and lets the role and the bot in", async () => {
    const { fake, run } = setup();
    expect((await run()).outcome).toBe("changed");
    const ids = vi.mocked(fake.putOverwrite).mock.calls.map(([, o]) => o.id);
    expect(ids).toEqual([GUILD, STAFF, BOT]);
  });

  it("leaves a private channel alone when none of its roles exist", async () => {
    const { fake, run } = setup();
    const result = await run(new Map());
    expect(result.outcome).toBe("skipped");
    expect(fake.putOverwrite).not.toHaveBeenCalled();
  });

  it("writes nothing when the channel already has this access", async () => {
    const letIn = PERMISSION.viewChannel | PERMISSION.sendMessages | PERMISSION.readMessageHistory;
    const { fake, run } = setup({}, [
      { id: GUILD, type: 0, allow: "0", deny: PERMISSION.viewChannel.toString() },
      { id: STAFF, type: 0, allow: letIn.toString(), deny: "0" },
      { id: BOT, type: 1, allow: letIn.toString(), deny: "0" },
    ]);
    expect((await run()).outcome).toBe("skipped");
    expect(fake.putOverwrite).not.toHaveBeenCalled();
  });

  it("explains a refused change (403) instead of a vague failure", async () => {
    const { run } = setup({
      putOverwrite: vi.fn(async () => {
        throw new DiscordRestError(403, undefined, "Missing Permissions");
      }),
    });
    const result = await run();
    expect(result.outcome).toBe("failed");
    expect(result.message).toMatch(/Manage Roles/);
  });
});
