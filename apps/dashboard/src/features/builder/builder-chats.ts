import { diffPlan, serverPlanSchema, type PlanDiff, type ServerPlan } from "@forgely/ai";
import type { BuilderChatRepository, BuilderRunRepository, BuilderRunRow } from "@forgely/db";

import type { ApplyResult } from "./apply-plan";
import { loadServerState } from "./server-state";

import type { DiscordGuildRest } from "@/lib/discord-guild-rest";
import { describeError, logWarning } from "@/lib/log";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  runId: string | null;
}

/** The plan a chat is currently about, as it should be shown on the right-hand side. */
export type ChatPlan =
  | { status: "planned"; runId: string; plan: ServerPlan; diff: PlanDiff }
  | { status: "finished"; runId: string; result: ApplyResult | null; didFail: boolean };

export interface LoadedChat {
  chatId: string;
  messages: ChatMessage[];
  current: ChatPlan | null;
}

export interface LoadChatDeps {
  chats: BuilderChatRepository;
  runs: BuilderRunRepository;
  rest: DiscordGuildRest;
}

function describeRun(run: BuilderRunRow, diff: PlanDiff | null): ChatPlan | null {
  const plan = serverPlanSchema.safeParse(run.plan);
  if (run.status === "planned" && plan.success && diff) {
    return { status: "planned", runId: run.id, plan: plan.data, diff };
  }
  if (run.status === "planned") return null;
  return {
    status: "finished",
    runId: run.id,
    // Stored by `applyBuilderPlan`, which only ever writes an ApplyResult here.
    result: (run.result as ApplyResult | null) ?? null,
    didFail: run.status === "failed",
  };
}

/** Reads the server again so ticks and "already exists" labels reflect the server as it is now. */
async function readDiff(deps: LoadChatDeps, guildId: string, run: BuilderRunRow) {
  const plan = serverPlanSchema.safeParse(run.plan);
  if (!plan.success) return null;
  try {
    const state = await loadServerState(deps.rest, guildId);
    return diffPlan(plan.data, state.snapshot);
  } catch (error) {
    logWarning("Could not read the server to open a chat", {
      guildId,
      error: describeError(error),
    });
    return null;
  }
}

/** Opens one of the person's chats with its messages and its latest plan. Null if it is not theirs. */
export async function loadBuilderChat(
  deps: LoadChatDeps,
  guildId: string,
  ownerId: string,
  chatId: string,
): Promise<LoadedChat | null> {
  const chat = await deps.chats.findChat(guildId, ownerId, chatId);
  if (!chat) return null;

  const rows = await deps.chats.listMessages(chat.id);
  const messages = rows.map(({ id, role, content, runId }) => ({ id, role, content, runId }));
  const lastRunId = rows.findLast((row) => row.runId)?.runId;
  const run = lastRunId ? await deps.runs.findForGuild(guildId, lastRunId) : null;
  const diff = run?.status === "planned" ? await readDiff(deps, guildId, run) : null;
  return { chatId: chat.id, messages, current: run ? describeRun(run, diff) : null };
}
