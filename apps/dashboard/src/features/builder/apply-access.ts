import type { AccessChangeDiff } from "@forgely/ai";

import { planAccessWrites } from "./access-overwrites";
import type { ServerState } from "./server-state";

import type { DiscordGuildRest } from "@/lib/discord-guild-rest";
import { DiscordRestError } from "@/lib/discord-transport";

const HTTP_FORBIDDEN = 403;

const REFUSED =
  "Forgely isn't allowed to change this channel's permissions. Give it Manage Channels and Manage Roles, and keep its role above the roles involved.";
const NO_ROLES = "None of the roles it needs exist on the server, so it was left as it is.";

export interface AccessOutcome {
  outcome: "changed" | "skipped" | "failed";
  message?: string;
}

interface AccessDeps {
  rest: DiscordGuildRest;
  guildId: string;
  botUserId: string;
  state: ServerState;
}

/**
 * Changes who can see or talk in one existing channel. Only the permission bits the access level needs are
 * edited, one role or member at a time, so nothing else on the channel is replaced. A change that would
 * leave a private channel with nobody allowed in is refused rather than applied.
 */
export async function applyAccessChange(
  deps: AccessDeps,
  change: AccessChangeDiff,
  roleIds: ReadonlyMap<string, string>,
): Promise<AccessOutcome> {
  const allowedRoleIds = change.roleKeys.flatMap((key) => roleIds.get(key) ?? []);
  if (change.to === "private" && allowedRoleIds.length === 0) {
    return { outcome: "skipped", message: NO_ROLES };
  }

  const channel = deps.state.channels.find((candidate) => candidate.id === change.id);
  const writes = planAccessWrites({
    kind: change.kind,
    access: change.to,
    allowedRoleIds,
    current: channel?.permission_overwrites,
    everyoneId: deps.guildId,
    botUserId: deps.botUserId,
  });
  if (writes.puts.length === 0 && writes.deletes.length === 0) {
    return { outcome: "skipped", message: "It already has this access." };
  }

  try {
    for (const put of writes.puts) await deps.rest.putOverwrite(change.id, put);
    for (const remove of writes.deletes) await deps.rest.deleteOverwrite(change.id, remove.id);
    return { outcome: "changed" };
  } catch (error) {
    const isRefused = error instanceof DiscordRestError && error.status === HTTP_FORBIDDEN;
    return {
      outcome: "failed",
      message: isRefused ? REFUSED : "Discord didn't accept the change.",
    };
  }
}
