"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PLAN_LIMITS } from "@forgely/ai";
import { createBuilderChatRepository, createBuilderRunRepository } from "@forgely/db";
import { snowflakeSchema } from "@forgely/shared";

import { applyBuilderPlan, type ApplyBuilderResult } from "./apply-builder-plan";
import { loadBuilderChat, type LoadedChat } from "./builder-chats";
import { generateBuilderPlan, type GenerateResult } from "./generate-builder-plan";

import { authorizeGuildAction } from "@/features/settings/authorize-action";
import { getAiProvider } from "@/lib/ai-provider";
import { getDatabase } from "@/lib/db";
import { getDiscordGuildRest } from "@/lib/discord-guild-rest";
import { getServerEnv } from "@/lib/env";
import { createRateLimiter } from "@/lib/rate-limiter";

/** Free-tier Gemini allows about 5 requests a minute in total, so stay just under it. */
const AI_REQUESTS_PER_MINUTE = 4;
const ONE_MINUTE_MS = 60_000;
const providerLimiter = createRateLimiter(AI_REQUESTS_PER_MINUTE, ONE_MINUTE_MS);

const MAX_EXCLUDED_IDS = 300;
/** Item IDs the plan hands out: a role key, `c<n>` for a category, `c<n>.<m>` for a channel. */
const itemIdSchema = z.string().regex(/^(c\d{1,3}(\.\d{1,3})?|[a-z0-9-]{1,32})$/);
const applyInputSchema = z.object({
  runId: z.uuid(),
  excludedIds: z.array(itemIdSchema).max(MAX_EXCLUDED_IDS),
  deleteIds: z.array(snowflakeSchema).max(PLAN_LIMITS.maxDeletions),
});

const INVALID_REQUEST = {
  ok: false,
  message: "That request wasn't valid. Reload the page and try again.",
} as const;

/** Server Action: ask the AI for a plan. Changes nothing in Discord. */
export async function generateBuilderPlanAction(
  guildId: string,
  description: unknown,
  chatId?: unknown,
): Promise<GenerateResult> {
  const authorization = await authorizeGuildAction(guildId);
  if (!authorization.ok) return { ok: false, message: authorization.message };
  if (typeof description !== "string") return INVALID_REQUEST;
  const chat = z.uuid().optional().safeParse(chatId);
  if (!chat.success) return INVALID_REQUEST;

  const db = getDatabase();
  const result = await generateBuilderPlan(
    {
      provider: getAiProvider(),
      rest: getDiscordGuildRest(),
      runs: createBuilderRunRepository(db),
      chats: createBuilderChatRepository(db),
      providerLimiter,
    },
    { guildId, actorId: authorization.actorId, description, chatId: chat.data },
  );
  if (result.ok) revalidatePath(`/dashboard/${guildId}/builder`);
  return result;
}

/** Server Action: create what the user approved and delete only what they ticked and confirmed. Never edits. */
export async function applyBuilderPlanAction(
  guildId: string,
  runId: unknown,
  excludedIds: unknown,
  deleteIds: unknown,
): Promise<ApplyBuilderResult> {
  const authorization = await authorizeGuildAction(guildId);
  if (!authorization.ok) return { ok: false, message: authorization.message };
  const input = applyInputSchema.safeParse({ runId, excludedIds, deleteIds });
  if (!input.success) return INVALID_REQUEST;

  const db = getDatabase();
  const result = await applyBuilderPlan(
    {
      rest: getDiscordGuildRest(),
      runs: createBuilderRunRepository(db),
      botUserId: getServerEnv().AUTH_DISCORD_ID,
    },
    {
      guildId,
      actorId: authorization.actorId,
      runId: input.data.runId,
      excludedIds: new Set(input.data.excludedIds),
      deleteIds: new Set(input.data.deleteIds),
    },
  );
  revalidatePath(`/dashboard/${guildId}/builder`);
  return result;
}

export type LoadChatResult = { ok: true; chat: LoadedChat } | { ok: false; message: string };

/** Server Action: open one of the signed-in person's chats. Other people's chats read as missing. */
export async function loadBuilderChatAction(
  guildId: string,
  chatId: unknown,
): Promise<LoadChatResult> {
  const authorization = await authorizeGuildAction(guildId);
  if (!authorization.ok) return { ok: false, message: authorization.message };
  const id = z.uuid().safeParse(chatId);
  if (!id.success) return INVALID_REQUEST;

  const db = getDatabase();
  const chat = await loadBuilderChat(
    {
      chats: createBuilderChatRepository(db),
      runs: createBuilderRunRepository(db),
      rest: getDiscordGuildRest(),
    },
    guildId,
    authorization.actorId,
    id.data,
  );
  return chat ? { ok: true, chat } : { ok: false, message: "I couldn't find that chat." };
}

/** Server Action: delete one chat, or all of them when `chatId` is omitted. Plans and history stay. */
export async function deleteBuilderChatsAction(
  guildId: string,
  chatId?: unknown,
): Promise<{ ok: boolean; message?: string }> {
  const authorization = await authorizeGuildAction(guildId);
  if (!authorization.ok) return { ok: false, message: authorization.message };
  const id = z.uuid().optional().safeParse(chatId);
  if (!id.success) return INVALID_REQUEST;

  const chats = createBuilderChatRepository(getDatabase());
  if (id.data) await chats.deleteChat(guildId, authorization.actorId, id.data);
  else await chats.deleteAllChats(guildId, authorization.actorId);
  revalidatePath(`/dashboard/${guildId}/builder`);
  return { ok: true };
}
