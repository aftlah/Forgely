import { diffPlan, selectPlan, serverPlanSchema, type CreationPlan } from "@forgely/ai";
import type { BuilderRunRepository } from "@forgely/db";

import { applyCreationPlan, type ApplyResult } from "./apply-plan";
import { loadServerState, type ServerState } from "./server-state";

import type { DiscordGuildRest } from "@/lib/discord-guild-rest";
import { describeError, logWarning } from "@/lib/log";

/** Discord's own server limits. Going over would fail halfway through, so check first. */
const MAX_GUILD_CHANNELS = 500;
const MAX_GUILD_ROLES = 250;

export interface ApplyBuilderDeps {
  rest: DiscordGuildRest;
  runs: BuilderRunRepository;
  /** The bot's own user ID, so a private channel never locks the bot out. */
  botUserId: string;
}

export interface ApplyBuilderInput {
  guildId: string;
  actorId: string;
  runId: string;
  /** Item IDs the user unticked. */
  excludedIds: ReadonlySet<string>;
  /** Discord IDs of the proposed deletions the user ticked. Nothing is deleted unless listed here. */
  deleteIds: ReadonlySet<string>;
}

export type ApplyBuilderResult = { ok: true; result: ApplyResult } | { ok: false; message: string };

const fail = (message: string): ApplyBuilderResult => ({ ok: false, message });

/** A category counts as one channel on Discord's side. */
function countNewChannels(creation: CreationPlan): number {
  return creation.categories.reduce(
    (total, category) => total + category.channels.length + (category.isNew ? 1 : 0),
    0,
  );
}

function findLimitProblem(creation: CreationPlan, state: ServerState): string | null {
  if (state.channels.length + countNewChannels(creation) > MAX_GUILD_CHANNELS) {
    return `This would go over Discord's limit of ${MAX_GUILD_CHANNELS} channels. Untick some, or remove unused channels first.`;
  }
  if (state.roles.length + creation.newRoles.length > MAX_GUILD_ROLES) {
    return `This would go over Discord's limit of ${MAX_GUILD_ROLES} roles. Untick some, or remove unused roles first.`;
  }
  return null;
}

interface Prepared {
  state: ServerState;
  creation: CreationPlan;
}

/** Everything that can be checked without changing anything: read the server, apply the choices, check limits. */
async function prepare(
  deps: ApplyBuilderDeps,
  input: ApplyBuilderInput,
): Promise<Prepared | { message: string }> {
  const run = await deps.runs.findForGuild(input.guildId, input.runId);
  if (!run) return { message: "I couldn't find that plan. Generate it again." };
  const stored = serverPlanSchema.safeParse(run.plan);
  if (!stored.success) return { message: "That plan is no longer valid. Generate a new one." };

  let state: ServerState;
  try {
    state = await loadServerState(deps.rest, input.guildId);
  } catch (error) {
    logWarning("Could not read the server before applying", {
      guildId: input.guildId,
      error: describeError(error),
    });
    return {
      message:
        "I couldn't read your server from Discord. Nothing was changed. Try again in a moment.",
    };
  }

  const diff = diffPlan(stored.data, state.snapshot);
  const creation = selectPlan(stored.data, diff, input.excludedIds, input.deleteIds);
  if (countNewChannels(creation) + creation.newRoles.length + creation.deletions.length === 0) {
    return { message: "There is nothing to create or delete with the current choices." };
  }
  const limitProblem = findLimitProblem(creation, state);
  return limitProblem ? { message: limitProblem } : { state, creation };
}

/**
 * Applies a stored plan. The server is read again first, so anything created since the plan was made
 * is skipped rather than duplicated, and a deletion is dropped if its target changed, vanished, or became
 * protected. A run can only be applied once: the claim is atomic.
 */
export async function applyBuilderPlan(
  deps: ApplyBuilderDeps,
  input: ApplyBuilderInput,
): Promise<ApplyBuilderResult> {
  const prepared = await prepare(deps, input);
  if ("message" in prepared) return fail(prepared.message);

  if (!(await deps.runs.claimForApply(input.guildId, input.runId))) {
    return fail("This plan was already applied, or is being applied right now.");
  }
  const result = await applyCreationPlan(
    { rest: deps.rest, guildId: input.guildId, botUserId: deps.botUserId, state: prepared.state },
    prepared.creation,
  );
  await deps.runs.finishWithAudit({
    guildId: input.guildId,
    runId: input.runId,
    actorId: input.actorId,
    status: result.createdCount + result.deletedCount === 0 ? "failed" : "applied",
    result,
  });
  return { ok: true, result };
}
