import { describe, expect, it, vi } from "vitest";

import { AiUnavailableError } from "@forgely/shared";

import { createGeminiProvider, toGeminiSchema } from "./gemini-provider";

const REQUEST = { system: "sys", user: "hi", jsonSchema: { type: "object" } };
const answer = (text: string): Response =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
  });
const status = (code: number): Response => new Response("{}", { status: code });

function setup(responses: (Response | Error)[]) {
  const queue = [...responses];
  const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra call");
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async (_milliseconds: number): Promise<void> => undefined);
  const provider = createGeminiProvider({
    apiKey: "secret-key",
    models: ["main", "backup"],
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep,
  });
  return { provider, fetchImpl, sleep };
}

const calledModels = (fetchImpl: { mock: { calls: unknown[][] } }): string[] =>
  fetchImpl.mock.calls.map((call) => String(call[0]).match(/models\/([^:]+):/)?.[1] ?? "");

describe("createGeminiProvider", () => {
  it("returns the text and the model that answered", async () => {
    const { provider } = setup([answer('{"a":1}')]);
    await expect(provider.generateJson(REQUEST)).resolves.toEqual({
      text: '{"a":1}',
      model: "main",
    });
  });

  it("sends the key in a header, never in the URL", async () => {
    const { provider, fetchImpl } = setup([answer("{}")]);
    await provider.generateJson(REQUEST);
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).not.toContain("secret-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret-key");
  });

  it("retries a 503 with backoff and then succeeds", async () => {
    const { provider, sleep, fetchImpl } = setup([status(503), status(503), answer("{}")]);
    await expect(provider.generateJson(REQUEST)).resolves.toMatchObject({ model: "main" });
    expect(calledModels(fetchImpl)).toEqual(["main", "main", "main"]);
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([1_000, 2_000]);
  });

  it("falls back to the next model after the retries run out", async () => {
    const { provider, fetchImpl } = setup([status(503), status(503), status(503), answer("{}")]);
    await expect(provider.generateJson(REQUEST)).resolves.toMatchObject({ model: "backup" });
    expect(calledModels(fetchImpl)).toEqual(["main", "main", "main", "backup"]);
  });

  it("skips straight to the fallback when a model no longer exists", async () => {
    const { provider, fetchImpl } = setup([status(404), answer("{}")]);
    await expect(provider.generateJson(REQUEST)).resolves.toMatchObject({ model: "backup" });
    expect(calledModels(fetchImpl)).toEqual(["main", "backup"]);
  });

  it("does not retry a rejected key", async () => {
    const { provider, fetchImpl } = setup([status(403)]);
    await expect(provider.generateJson(REQUEST)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("treats a network failure like an overload", async () => {
    const { provider } = setup([new Error("socket hang up"), answer("{}")]);
    await expect(provider.generateJson(REQUEST)).resolves.toMatchObject({ model: "main" });
  });

  it("gives a safe error when every model fails", async () => {
    const { provider } = setup(Array.from({ length: 6 }, () => status(503)));
    const error = await provider.generateJson(REQUEST).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AiUnavailableError);
    expect((error as AiUnavailableError).userMessage).toContain("Nothing was changed");
  });

  it("fails on a blocked prompt instead of retrying", async () => {
    const blocked = new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }), {
      status: 200,
    });
    const { provider, fetchImpl } = setup([blocked]);
    await expect(provider.generateJson(REQUEST)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("toGeminiSchema", () => {
  it("drops the keywords Gemini rejects, at any depth, and keeps the rest", () => {
    const schema = {
      $schema: "x",
      type: "object",
      properties: {
        list: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", maxLength: 5 } },
      },
    };
    expect(toGeminiSchema(schema)).toEqual({
      type: "object",
      properties: { list: { type: "array", items: { type: "string", maxLength: 5 } } },
    });
  });
});
