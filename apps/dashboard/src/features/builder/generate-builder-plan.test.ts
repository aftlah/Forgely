import { describe, expect, it, vi } from "vitest";

import type { AiProvider, ServerPlan } from "@forgely/ai";
import type { BuilderChatRepository, BuilderRunRepository } from "@forgely/db";
import { AiUnavailableError } from "@forgely/shared";

import { DAILY_PLAN_LIMIT, generateBuilderPlan } from "./generate-builder-plan";

import type { DiscordGuildRest } from "@/lib/discord-guild-rest";

const GUILD = "869020525853311026";
const ACTOR = "345934416490528778";

const PLAN: ServerPlan = {
  summary: "A chess club",
  deletions: [],
  roles: [{ key: "member", name: "Member", color: null, isHoisted: false }],
  categories: [
    {
      name: "Club",
      channels: [
        { name: "chat", kind: "text", topic: null, access: "public", allowedRoleKeys: [] },
      ],
    },
  ],
};

function setup(
  overrides: {
    count?: number;
    provider?: AiProvider;
    allowProvider?: boolean;
    rest?: Partial<DiscordGuildRest>;
    /** An existing chat whose latest message carries `PLAN`. */
    hasChat?: boolean;
  } = {},
) {
  const create = vi.fn(async (input: { plan: unknown }) => ({ id: "run-1", ...input }));
  const runs = {
    countCreatedSince: vi.fn(async () => overrides.count ?? 0),
    findForGuild: vi.fn(async () => ({ plan: PLAN })),
    create,
  } as unknown as BuilderRunRepository;
  const addExchange = vi.fn(async () => undefined);
  const createChat = vi.fn(async () => ({ id: "chat-1" }));
  const chats = {
    createChat,
    addExchange,
    findChat: vi.fn(async () => (overrides.hasChat ? { id: "chat-9" } : null)),
    listMessages: vi.fn(async () => (overrides.hasChat ? [{ runId: "run-0" }] : [])),
  } as unknown as BuilderChatRepository;
  const provider: AiProvider = overrides.provider ?? {
    generateJson: vi.fn(async () => ({ text: JSON.stringify(PLAN), model: "m" })),
  };
  const rest: DiscordGuildRest = {
    listChannels: vi.fn(async () => []),
    listRoles: vi.fn(async () => []),
    createRole: vi.fn(),
    createChannel: vi.fn(),
    listSpecialChannelIds: vi.fn(async () => []),
    deleteChannel: vi.fn(async () => undefined),
    deleteRole: vi.fn(async () => undefined),
    ...overrides.rest,
  };
  const providerLimiter = { tryAcquire: vi.fn(() => overrides.allowProvider ?? true) };
  const run = (chatId?: string) =>
    generateBuilderPlan(
      { provider, rest, runs, chats, providerLimiter },
      { guildId: GUILD, actorId: ACTOR, description: "A chess club", chatId },
    );
  return { run, create, provider, providerLimiter, addExchange, createChat, chats };
}

describe("generateBuilderPlan", () => {
  it("stores the plan as a run and returns the diff, without creating anything in Discord", async () => {
    const { run, create } = setup();
    const result = await run();
    expect(result).toMatchObject({ ok: true, runId: "run-1", diff: { newCount: 3 } });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: GUILD,
        actorId: ACTOR,
        prompt: "A chess club",
        model: "m",
      }),
    );
  });

  it("stops at the daily limit before spending an AI request", async () => {
    const { run, provider } = setup({ count: DAILY_PLAN_LIMIT });
    const result = await run();
    expect(result).toMatchObject({ ok: false });
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("asks the user to wait when the shared AI budget is used up", async () => {
    const { run, provider } = setup({ allowProvider: false });
    const result = await run();
    expect(result).toEqual({ ok: false, message: expect.stringContaining("busy") });
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("passes the AI's safe error message to the user", async () => {
    const provider: AiProvider = {
      generateJson: vi.fn(async () => {
        throw new AiUnavailableError("503 everywhere");
      }),
    };
    const { run, create } = setup({ provider });
    const result = await run();
    expect(result).toEqual({ ok: false, message: expect.stringContaining("Nothing was changed") });
    expect(create).not.toHaveBeenCalled();
  });

  it("reports Discord being unreachable without calling the AI", async () => {
    const { run, provider } = setup({
      rest: {
        listChannels: vi.fn(async () => {
          throw new Error("down");
        }),
      },
    });
    const result = await run();
    expect(result).toMatchObject({ ok: false });
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("starts a chat titled after the first message and saves both sides of the exchange", async () => {
    const { run, createChat, addExchange } = setup();
    const result = await run();
    expect(result).toMatchObject({ ok: true, chatId: "chat-1" });
    expect(createChat).toHaveBeenCalledWith(GUILD, ACTOR, "A chess club");
    expect(addExchange).toHaveBeenCalledWith("chat-1", [
      { role: "user", content: "A chess club" },
      { role: "assistant", content: PLAN.summary, runId: "run-1" },
    ]);
  });

  it("continues an existing chat and shows the AI its latest plan", async () => {
    const { run, createChat, addExchange, provider } = setup({ hasChat: true });
    const result = await run("chat-9");
    expect(result).toMatchObject({ ok: true, chatId: "chat-9" });
    expect(createChat).not.toHaveBeenCalled();
    expect(addExchange).toHaveBeenCalledWith("chat-9", expect.any(Array));
    const request = vi.mocked(provider.generateJson).mock.calls[0]?.[0];
    expect(request?.user).toContain("Previous plan");
  });

  it("refuses a chat that is not the person's, without spending an AI request", async () => {
    const { run, provider } = setup({ hasChat: false });
    const result = await run("someone-elses-chat");
    expect(result).toEqual({ ok: false, message: expect.stringContaining("chat") });
    expect(provider.generateJson).not.toHaveBeenCalled();
  });
});
