import { describe, expect, it, vi } from "vitest";

import { createTransport } from "./discord-transport";

const rateLimited = (seconds: number): Response =>
  new Response(JSON.stringify({ retry_after: seconds }), { status: 429 });

function setup(responses: Response[]) {
  const queue = [...responses];
  const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra call");
    return next;
  });
  const sleep = vi.fn(async (_milliseconds: number): Promise<void> => undefined);
  const transport = createTransport({
    botToken: "bot-token",
    apiBaseUrl: "https://discord.test/api",
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep,
  });
  return { transport, fetchImpl, sleep };
}

describe("createTransport", () => {
  it("authenticates as the bot and sends a JSON body", async () => {
    const { transport, fetchImpl } = setup([new Response("{}", { status: 200 })]);
    await transport.request("POST", "/guilds/1/roles", { name: "Mod" });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://discord.test/api/guilds/1/roles");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bot bot-token");
    expect(init?.body).toBe(JSON.stringify({ name: "Mod" }));
  });

  it("waits out a rate limit and tries again", async () => {
    const { transport, sleep, fetchImpl } = setup([rateLimited(1.2), new Response("{}")]);
    const response = await transport.request("GET", "/x");
    expect(response.status).toBe(200);
    expect(sleep).toHaveBeenCalledWith(1_200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up when Discord asks for an unreasonably long wait", async () => {
    const { transport, sleep } = setup([rateLimited(120)]);
    const response = await transport.request("GET", "/x");
    expect(response.status).toBe(429);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("stops retrying after a few rate limits in a row", async () => {
    const { transport, fetchImpl } = setup(Array.from({ length: 4 }, () => rateLimited(1)));
    const response = await transport.request("GET", "/x");
    expect(response.status).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
});
