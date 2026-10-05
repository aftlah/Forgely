import { OverwriteType, PermissionFlagsBits, type Guild } from "discord.js";
import { describe, expect, it, vi } from "vitest";

import { createTicketsPort } from "./discord-tickets-adapter";

const EVERYONE = "111111111111111111";
const BOT = "222222222222222222";
const OPENER = "333333333333333333";
const SUPPORT = "444444444444444444";
const GONE_ROLE = "555555555555555555";

function fakeGuild() {
  const create = vi.fn(async () => ({ id: "666666666666666666" }));
  const guild = {
    roles: { everyone: { id: EVERYONE }, cache: new Map([[SUPPORT, {}]]) },
    channels: { create },
    client: { user: { id: BOT } },
  } as unknown as Guild;
  return { guild, create };
}

describe("createTicketsPort.createChannel", () => {
  it("states the type of every permission overwrite, so a member who is not cached can still get a ticket", async () => {
    const { guild, create } = fakeGuild();
    await createTicketsPort(guild).createChannel({
      name: "ticket-ada",
      categoryId: "777777777777777777",
      openerId: OPENER,
      supportRoleIds: [SUPPORT],
    });

    const options = (
      create.mock.calls[0] as unknown as [{ permissionOverwrites: { id: string; type: number }[] }]
    )[0];
    const byId = new Map(
      options.permissionOverwrites.map((overwrite) => [overwrite.id, overwrite]),
    );
    expect(byId.get(EVERYONE)?.type).toBe(OverwriteType.Role);
    expect(byId.get(SUPPORT)?.type).toBe(OverwriteType.Role);
    expect(byId.get(OPENER)?.type).toBe(OverwriteType.Member);
    expect(byId.get(BOT)?.type).toBe(OverwriteType.Member);
  });

  it("hides the channel from everyone and shows it only to the person, the team, and the bot", async () => {
    const { guild, create } = fakeGuild();
    await createTicketsPort(guild).createChannel({
      name: "ticket-ada",
      categoryId: "777777777777777777",
      openerId: OPENER,
      supportRoleIds: [SUPPORT],
    });
    const { permissionOverwrites } = (
      create.mock.calls[0] as unknown as [
        { permissionOverwrites: { id: string; allow?: bigint[]; deny?: bigint[] }[] },
      ]
    )[0];
    expect(permissionOverwrites.find((o) => o.id === EVERYONE)?.deny).toContain(
      PermissionFlagsBits.ViewChannel,
    );
    expect(permissionOverwrites.map((o) => o.id).sort()).toEqual(
      [EVERYONE, OPENER, SUPPORT, BOT].sort(),
    );
  });

  it("leaves out a support role that no longer exists, which would make Discord refuse the channel", async () => {
    const { guild, create } = fakeGuild();
    await createTicketsPort(guild).createChannel({
      name: "ticket-ada",
      categoryId: "777777777777777777",
      openerId: OPENER,
      supportRoleIds: [SUPPORT, GONE_ROLE],
    });
    const { permissionOverwrites } = (
      create.mock.calls[0] as unknown as [{ permissionOverwrites: { id: string }[] }]
    )[0];
    expect(permissionOverwrites.some((o) => o.id === GONE_ROLE)).toBe(false);
  });
});
