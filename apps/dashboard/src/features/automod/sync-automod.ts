import type { AutomodConfig } from "@forgely/shared";

import { buildDesiredRules, RULE_PREFIX } from "./build-rules";

import type { AutomodRest, ExistingAutomodRule } from "@/lib/discord-automod-rest";
import { DiscordRestError } from "@/lib/discord-transport";

const HTTP_FORBIDDEN = 403;
/** Discord's code for "this server already has the maximum number of rules of this type". */
const ERROR_MAX_RULES_OF_TYPE = 30_032;

export interface SyncInput {
  guildId: string;
  isEnabled: boolean;
  config: AutomodConfig;
}

export type SyncResult =
  { ok: true; created: number; updated: number; deleted: number } | { ok: false; message: string };

/** Turns a Discord refusal into something an owner can act on. */
export function explainAutomodError(error: unknown): string {
  if (error instanceof DiscordRestError && error.status === HTTP_FORBIDDEN) {
    return "Forgely needs the Manage Server permission to set up AutoMod. Give it that permission and try again.";
  }
  if (error instanceof DiscordRestError && error.code === ERROR_MAX_RULES_OF_TYPE) {
    return "Your server already has the most AutoMod rules Discord allows of one kind. Remove one in Server Settings → AutoMod and try again.";
  }
  return "Discord didn't accept the AutoMod rules. Try again in a moment.";
}

/**
 * Makes Discord's AutoMod match the settings. Forgely only ever touches rules whose name starts with its own
 * prefix, so rules the owner made by hand are never changed or removed. It is safe to run again at any time:
 * a rule that is already right is updated to the same thing, never duplicated.
 */
export async function syncAutomod(
  deps: { rest: AutomodRest },
  input: SyncInput,
): Promise<SyncResult> {
  const { rest } = deps;
  const { guildId } = input;
  let existing: ExistingAutomodRule[];
  try {
    existing = (await rest.listRules(guildId)).filter((entry) =>
      entry.name.startsWith(RULE_PREFIX),
    );
  } catch (error) {
    return { ok: false, message: explainAutomodError(error) };
  }

  const desired = input.isEnabled ? buildDesiredRules(input.config) : [];
  const wanted = new Set(desired.map((entry) => entry.name));
  const counts = { created: 0, updated: 0, deleted: 0 };
  const failures: string[] = [];

  async function run(counter: keyof typeof counts, action: () => Promise<void>): Promise<void> {
    try {
      await action();
      counts[counter] += 1;
    } catch (error) {
      failures.push(explainAutomodError(error));
    }
  }

  // Removing first frees room under Discord's per-type limits for a rule that takes its place.
  for (const stale of existing.filter((entry) => !wanted.has(entry.name))) {
    await run("deleted", () => rest.deleteRule(guildId, stale.id));
  }
  for (const { event_type, trigger_type, ...changes } of desired) {
    const found = existing.find((entry) => entry.name === changes.name);
    if (found) await run("updated", () => rest.updateRule(guildId, found.id, changes));
    else
      await run("created", () =>
        rest.createRule(guildId, { event_type, trigger_type, ...changes }),
      );
  }

  return failures.length > 0 ? { ok: false, message: failures[0] ?? "" } : { ok: true, ...counts };
}
