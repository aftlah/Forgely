import { describe, expect, it, vi } from "vitest";

import { createDiscordRest, DiscordRestError } from "./discord-rest";

const CHANNEL = "100000000000000001";
const MESSAGE = "300000000000000001";
const options = { botToken: "bot-token", apiBaseUrl: "https://discord.test/api" };

describe("postMessage", () => {
  it("posts as the bot and returns the new message id", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ id: MESSAGE }));

    const result = await createDiscordRest({ ...options, fetchImpl }).postMessage(CHANNEL, {
      embeds: [],
    });

    expect(result).toEqual({ id: MESSAGE });
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://discord.test/api/channels/${CHANNEL}/messages`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bot bot-token" }),
      }),
    );
  });

  it("throws a typed error carrying Discord's status and error code", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ code: 50013 }, { status: 403 }));

    const attempt = createDiscordRest({ ...options, fetchImpl }).postMessage(CHANNEL, {});

    await expect(attempt).rejects.toBeInstanceOf(DiscordRestError);
    await expect(attempt).rejects.toMatchObject({ status: 403, code: 50013 });
  });

  it("copes with an error body that is not JSON", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>bad gateway</html>", { status: 502 }));

    await expect(
      createDiscordRest({ ...options, fetchImpl }).postMessage(CHANNEL, {}),
    ).rejects.toMatchObject({ status: 502, code: undefined });
  });

  it("refuses a success response with no message id", async () => {
    const fetchImpl = vi.fn(async () => Response.json({}));

    await expect(
      createDiscordRest({ ...options, fetchImpl }).postMessage(CHANNEL, {}),
    ).rejects.toBeInstanceOf(DiscordRestError);
  });
});

describe("editMessage", () => {
  it("edits in place", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ id: MESSAGE }));

    expect(
      await createDiscordRest({ ...options, fetchImpl }).editMessage(CHANNEL, MESSAGE, {}),
    ).toBe("edited");
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://discord.test/api/channels/${CHANNEL}/messages/${MESSAGE}`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("reports a deleted message as 'missing' instead of failing, so the caller can post again", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ code: 10008 }, { status: 404 }));

    expect(
      await createDiscordRest({ ...options, fetchImpl }).editMessage(CHANNEL, MESSAGE, {}),
    ).toBe("missing");
  });

  it("still throws for other failures, such as missing permissions", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ code: 50013 }, { status: 403 }));

    await expect(
      createDiscordRest({ ...options, fetchImpl }).editMessage(CHANNEL, MESSAGE, {}),
    ).rejects.toMatchObject({ status: 403 });
  });
});
