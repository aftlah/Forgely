import { describe, expect, it, vi } from "vitest";

import { createDiscordGuildRest } from "./discord-guild-rest";
import { DiscordRestError } from "./discord-transport";

const GUILD = "869020525853311026";
const ID = "100000000000000001";

function rest(response: Response) {
  const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => response);
  return {
    fetchImpl,
    client: createDiscordGuildRest({
      botToken: "t",
      apiBaseUrl: "https://discord.test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }),
  };
}

describe("createDiscordGuildRest", () => {
  it("lists channels with their category", async () => {
    const { client } = rest(
      new Response(JSON.stringify([{ id: ID, name: "rules", type: 0, parent_id: null, extra: 1 }])),
    );
    await expect(client.listChannels(GUILD)).resolves.toEqual([
      { id: ID, name: "rules", type: 0, parent_id: null },
    ]);
  });

  it("creates a role with a POST and returns its id", async () => {
    const { client, fetchImpl } = rest(new Response(JSON.stringify({ id: ID, name: "Mod" })));
    await expect(
      client.createRole(GUILD, { name: "Mod", color: 0, hoist: false }),
    ).resolves.toEqual({
      id: ID,
    });
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("keeps Discord's error code when creation is refused", async () => {
    const { client } = rest(new Response(JSON.stringify({ code: 50013 }), { status: 403 }));
    const error = await client
      .createChannel(GUILD, { name: "x", type: 0 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DiscordRestError);
    expect(error).toMatchObject({ status: 403, code: 50013 });
  });

  it("rejects a response with an unexpected shape", async () => {
    const { client } = rest(new Response(JSON.stringify({ nope: true })));
    await expect(client.createChannel(GUILD, { name: "x", type: 0 })).rejects.toBeInstanceOf(
      DiscordRestError,
    );
  });

  it("deletes a channel with a DELETE and accepts the empty 204 answer", async () => {
    const { client, fetchImpl } = rest(new Response(null, { status: 204 }));
    await expect(client.deleteChannel(ID)).resolves.toBeUndefined();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`https://discord.test/channels/${ID}`);
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });

  it("deletes a role in the right server", async () => {
    const { client, fetchImpl } = rest(new Response(null, { status: 204 }));
    await client.deleteRole(GUILD, ID);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`https://discord.test/guilds/${GUILD}/roles/${ID}`);
  });

  it("turns a refused delete into a typed error that keeps the status", async () => {
    const { client } = rest(new Response(JSON.stringify({ code: 50013 }), { status: 403 }));
    await expect(client.deleteChannel(ID)).rejects.toMatchObject({ status: 403, code: 50013 });
  });

  it("lists the channels Discord relies on, skipping the ones that are not set", async () => {
    const { client } = rest(
      new Response(
        JSON.stringify({ rules_channel_id: ID, public_updates_channel_id: null, name: "x" }),
      ),
    );
    await expect(client.listSpecialChannelIds(GUILD)).resolves.toEqual([ID]);
  });
});
