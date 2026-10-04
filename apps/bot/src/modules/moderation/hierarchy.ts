import type { ModerationParty } from "./moderation.types";

export type ModerationBlocker = "self" | "bot" | "owner" | "actor_hierarchy" | "bot_hierarchy";

export const BLOCKER_MESSAGES: Record<ModerationBlocker, string> = {
  self: "You can't moderate yourself.",
  bot: "I can't moderate myself.",
  owner: "The server owner can't be moderated.",
  actor_hierarchy: "You can't moderate someone whose highest role is equal to or above yours.",
  bot_hierarchy:
    "I can't moderate someone whose highest role is equal to or above mine. Move my role higher in Server Settings.",
};

interface BlockerInput {
  actor: ModerationParty;
  bot: ModerationParty;
  targetId: string;
  /** Null when the target is not in the server (only possible for bans). */
  target: ModerationParty | null;
}

/**
 * Returns why this action must not happen, or undefined if it may proceed. Mirrors Discord's own
 * role-hierarchy rules so users get a clear message instead of a vague API error.
 */
export function getModerationBlocker({
  actor,
  bot,
  targetId,
  target,
}: BlockerInput): ModerationBlocker | undefined {
  if (targetId === actor.id) return "self";
  if (targetId === bot.id) return "bot";
  if (!target) return undefined;
  if (target.isOwner) return "owner";

  const actorOutranksTarget =
    actor.isOwner || actor.highestRolePosition > target.highestRolePosition;
  if (!actorOutranksTarget) return "actor_hierarchy";
  if (bot.highestRolePosition <= target.highestRolePosition) return "bot_hierarchy";
  return undefined;
}
