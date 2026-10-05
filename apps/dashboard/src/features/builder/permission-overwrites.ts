import type { PlanChannel } from "@forgely/ai";

import { PERMISSION } from "./constants";

import type { PermissionOverwrite } from "@/lib/discord-guild-rest";

const NONE = 0n;
const ROLE_OVERWRITE = 0;
const MEMBER_OVERWRITE = 1;

/** Typing, threads, and forum posts: everything "read-only" takes away from everyone. */
const SPEAKING = [
  PERMISSION.sendMessages,
  PERMISSION.createPublicThreads,
  PERMISSION.createPrivateThreads,
  PERMISSION.sendMessagesInThreads,
].reduce((all, bit) => all | bit, NONE);

const asBits = (bits: bigint): string => bits.toString();

export interface OverwriteContext {
  /** The `@everyone` role; its ID equals the server's ID. */
  everyoneId: string;
  botUserId: string;
  /** Plan role key to the real role ID. */
  roleIds: ReadonlyMap<string, string>;
}

function privateOverwrites(channel: PlanChannel, context: OverwriteContext): PermissionOverwrite[] {
  const isVoice = channel.kind === "voice";
  const allowed = isVoice
    ? PERMISSION.viewChannel | PERMISSION.connect
    : PERMISSION.viewChannel | PERMISSION.sendMessages | PERMISSION.readMessageHistory;
  const roles = channel.allowedRoleKeys.flatMap((key) => {
    const id = context.roleIds.get(key);
    return id
      ? [{ id, type: ROLE_OVERWRITE, allow: asBits(allowed), deny: asBits(NONE) } as const]
      : [];
  });
  return [
    {
      id: context.everyoneId,
      type: ROLE_OVERWRITE,
      allow: asBits(NONE),
      deny: asBits(PERMISSION.viewChannel),
    },
    // Without this the bot could lock itself out of a channel it just made.
    { id: context.botUserId, type: MEMBER_OVERWRITE, allow: asBits(allowed), deny: asBits(NONE) },
    ...roles,
  ];
}

/**
 * Turns a plan channel's access into Discord permission overwrites. Public channels get none and
 * simply inherit; read-only takes away speaking from everyone; private hides it from everyone but
 * the listed roles and the bot.
 */
export function buildOverwrites(
  channel: PlanChannel,
  context: OverwriteContext,
): PermissionOverwrite[] | undefined {
  if (channel.access === "private") return privateOverwrites(channel, context);
  if (channel.access === "read-only" && channel.kind !== "voice") {
    return [
      { id: context.everyoneId, type: ROLE_OVERWRITE, allow: asBits(NONE), deny: asBits(SPEAKING) },
    ];
  }
  return undefined;
}
