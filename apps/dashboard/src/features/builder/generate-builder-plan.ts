import {
  diffPlan,
  generatePlan,
  type AiProvider,
  type PlanDiff,
  serverPlanSchema,
  type ServerPlan,
} from "@forgely/ai";
import type { BuilderChatRepository, BuilderRunRepository } from "@forgely/db";
import { ForgelyError } from "@forgely/shared";

import { loadServerState, type ServerState } from "./server-state";

import type { DiscordGuildRest } from "@/lib/discord-guild-rest";
import { describeError, logWarning } from "@/lib/log";
import type { RateLimiter } from "@/lib/rate-limiter";

/** How many plans one server may ask for per day. Each one costs an AI request. */
export const DAILY_PLAN_LIMIT = 10;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const ONE_DAY_MS = 86_400_000;

export interface GenerateDeps {
  provider: AiProvider;
  rest: DiscordGuildRest;
  runs: BuilderRunRepository;
  chats: BuilderChatRepository;
  /** Shared across every server: the AI provider's free tier has a small per-minute budget. */
  providerLimiter: RateLimiter;
  /** Plans per rolling 24 hours. Defaults to `DAILY_PLAN_LIMIT`. */
  dailyLimit?: number;
  now?: () => Date;
}

export interface GenerateInput {
  guildId: string;
  actorId: string;
  description: string;
  /** Continue this chat (its latest plan is revised). Omit to start a new chat. */
  chatId?: string;
}

export type GenerateResult =
  | { ok: true; chatId: string; runId: string; plan: ServerPlan; diff: PlanDiff }
  | { ok: false; message: string };

const PROVIDER_LIMIT_KEY = "ai-provider";
const CHAT_NOT_FOUND = "I couldn't find that chat. Start a new one.";
const MAX_TITLE_LENGTH = 60;
const DISCORD_UNREACHABLE =
  "I couldn't read your server from Discord. Nothing was changed. Try again in a moment.";

/** "about 25 minutes" or "about 3 hours": when the oldest plan leaves the 24-hour window. */
function describeWait(milliseconds: number): string {
  const minutes = Math.max(1, Math.ceil(milliseconds / MS_PER_MINUTE));
  if (minutes < MINUTES_PER_HOUR) return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / MINUTES_PER_HOUR);
  return `about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/** The cheap checks, run before anything is read or any AI request is spent. */
async function findLimitProblem(deps: GenerateDeps, input: GenerateInput): Promise<string | null> {
  const now = (deps.now ?? (() => new Date()))();
  const since = new Date(now.getTime() - ONE_DAY_MS);
  const limit = deps.dailyLimit ?? DAILY_PLAN_LIMIT;
  if ((await deps.runs.countCreatedSince(input.guildId, since)) >= limit) {
    const oldest = await deps.runs.oldestCreatedSince(input.guildId, since);
    const wait = oldest ? describeWait(oldest.getTime() + ONE_DAY_MS - now.getTime()) : "a while";
    return `This server has used its ${limit} plans in the last 24 hours. The next one frees up in ${wait}.`;
  }
  if (!deps.providerLimiter.tryAcquire(PROVIDER_LIMIT_KEY)) {
    return "The AI is busy right now. Wait a minute and try again.";
  }
  return null;
}

/** The plan the chat is currently about, so a follow-up message revises it instead of starting over. */
async function findPreviousPlan(
  deps: GenerateDeps,
  input: GenerateInput,
  chatId: string,
): Promise<ServerPlan | undefined> {
  const messages = await deps.chats.listMessages(chatId);
  const runId = messages.findLast((message) => message.runId)?.runId;
  if (!runId) return undefined;
  const run = await deps.runs.findForGuild(input.guildId, runId);
  const parsed = serverPlanSchema.safeParse(run?.plan);
  return parsed.success ? parsed.data : undefined;
}

function makeTitle(description: string): string {
  const text = description.trim().replaceAll(/\s+/g, " ");
  return text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH)}…` : text;
}

/** Stores the run and both sides of the exchange, starting the chat if this is its first message. */
async function saveExchange(
  deps: GenerateDeps,
  input: GenerateInput,
  generated: { plan: ServerPlan; model: string },
  existingChatId: string | undefined,
): Promise<{ chatId: string; runId: string }> {
  const prompt = input.description.trim();
  const run = await deps.runs.create({
    guildId: input.guildId,
    actorId: input.actorId,
    prompt,
    plan: generated.plan,
    model: generated.model,
  });
  const chatId =
    existingChatId ??
    (await deps.chats.createChat(input.guildId, input.actorId, makeTitle(prompt))).id;
  await deps.chats.addExchange(chatId, [
    { role: "user", content: prompt },
    { role: "assistant", content: generated.plan.summary, runId: run.id },
  ]);
  return { chatId, runId: run.id };
}

/**
 * Asks the AI for a plan and stores it as a `planned` run. It changes nothing in Discord: the user
 * reviews the plan first, and only Apply creates anything.
 */
export async function generateBuilderPlan(
  deps: GenerateDeps,
  input: GenerateInput,
): Promise<GenerateResult> {
  const limitProblem = await findLimitProblem(deps, input);
  if (limitProblem) return { ok: false, message: limitProblem };

  const existingChat = input.chatId
    ? await deps.chats.findChat(input.guildId, input.actorId, input.chatId)
    : null;
  if (input.chatId && !existingChat) return { ok: false, message: CHAT_NOT_FOUND };
  const previousPlan = existingChat
    ? await findPreviousPlan(deps, input, existingChat.id)
    : undefined;

  let state: ServerState;
  try {
    state = await loadServerState(deps.rest, input.guildId);
  } catch (error) {
    logWarning("Could not read the server for the builder", {
      guildId: input.guildId,
      error: describeError(error),
    });
    return { ok: false, message: DISCORD_UNREACHABLE };
  }

  try {
    const generated = await generatePlan({
      provider: deps.provider,
      description: input.description,
      snapshot: state.snapshot,
      previousPlan,
    });
    const saved = await saveExchange(deps, input, generated, existingChat?.id);
    const diff = diffPlan(generated.plan, state.snapshot);
    return { ok: true, ...saved, plan: generated.plan, diff };
  } catch (error) {
    if (!(error instanceof ForgelyError)) throw error;
    logWarning("Plan generation failed", { guildId: input.guildId, error: describeError(error) });
    return { ok: false, message: error.userMessage };
  }
}
