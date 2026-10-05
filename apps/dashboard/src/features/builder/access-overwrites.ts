import type { ChannelAccess, ChannelAccessState, ChannelKind } from "@forgely/ai";

import { PERMISSION } from "./constants";

import type { PermissionOverwrite } from "@/lib/discord-guild-rest";

const NONE = 0n;
const ROLE_OVERWRITE = 0;
const MEMBER_OVERWRITE = 1;

/** Typing, threads, and forum posts: what "read-only" takes away from everyone. Same set the creator uses. */
const SPEAKING =
  PERMISSION.sendMessages |
  PERMISSION.createPublicThreads |
  PERMISSION.createPrivateThreads |
  PERMISSION.sendMessagesInThreads;

/** The only bits this module ever changes on @everyone. Everything else a person set stays as it was. */
const EVERYONE_MANAGED = PERMISSION.viewChannel | SPEAKING;
/** What a role or the bot is given to be let into a private channel, for text and for voice. */
const TEXT_ACCESS =
  PERMISSION.viewChannel | PERMISSION.sendMessages | PERMISSION.readMessageHistory;
const VOICE_ACCESS = PERMISSION.viewChannel | PERMISSION.connect;
/** Everything "let in" can mean, so taking access away from a role clears all of it. */
const ANY_ACCESS = TEXT_ACCESS | VOICE_ACCESS;

/** A permission overwrite as Discord reports it on an existing channel. */
export interface CurrentOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

const toBits = (value: string | undefined): bigint => BigInt(value ?? "0");

/**
 * Reads a channel's own permission overwrites as one of the three access levels the builder knows. Only the
 * channel's own settings count: whatever it inherits from its category is not looked at.
 */
export function classifyAccess(
  overwrites: readonly CurrentOverwrite[] | undefined,
  everyoneId: string,
  kind: ChannelKind,
): ChannelAccessState {
  const everyone = overwrites?.find((o) => o.id === everyoneId && o.type === ROLE_OVERWRITE);
  const deny = toBits(everyone?.deny);

  if ((deny & PERMISSION.viewChannel) !== NONE) {
    const viewRoleIds = (overwrites ?? [])
      .filter((o) => o.type === ROLE_OVERWRITE && o.id !== everyoneId)
      .filter((o) => (toBits(o.allow) & PERMISSION.viewChannel) !== NONE)
      .map((o) => o.id);
    return { access: "private", viewRoleIds };
  }
  const isReadOnly = kind !== "voice" && (deny & PERMISSION.sendMessages) !== NONE;
  return { access: isReadOnly ? "read-only" : "public", viewRoleIds: [] };
}

export interface AccessWrites {
  /** Overwrites to set (each one replaces only that one role's or member's overwrite). */
  puts: PermissionOverwrite[];
  /** Overwrites that end up empty, so they are removed instead of left as clutter. */
  deletes: { id: string; type: 0 | 1 }[];
}

export interface AccessInput {
  kind: ChannelKind;
  access: ChannelAccess;
  /** Real role IDs allowed in, for a private channel. */
  allowedRoleIds: readonly string[];
  current: readonly CurrentOverwrite[] | undefined;
  everyoneId: string;
  botUserId: string;
}

/** Roles that can see the channel but are not wanted lose "let in"; their other permissions stay. */
function revokeUnwanted(
  current: readonly CurrentOverwrite[] | undefined,
  wanted: ReadonlySet<string>,
  everyoneId: string,
  write: (id: string, type: 0 | 1, allow: bigint, deny: bigint) => void,
): void {
  for (const overwrite of current ?? []) {
    const isOtherRole = overwrite.type === ROLE_OVERWRITE && overwrite.id !== everyoneId;
    if (!isOtherRole || wanted.has(overwrite.id)) continue;
    if ((toBits(overwrite.allow) & PERMISSION.viewChannel) === NONE) continue;
    write(
      overwrite.id,
      ROLE_OVERWRITE,
      toBits(overwrite.allow) & ~ANY_ACCESS,
      toBits(overwrite.deny),
    );
  }
}

/**
 * Works out the smallest set of overwrite changes that gives a channel the wanted access. It never replaces a
 * channel's whole permission list: it edits @everyone's view and speaking bits, lets the wanted roles and the
 * bot in, and takes "let in" away from roles that had it but are not wanted. Any other permission anyone was
 * given or denied is left exactly as it is.
 */
export function planAccessWrites(input: AccessInput): AccessWrites {
  const { kind, allowedRoleIds, current, everyoneId, botUserId } = input;
  const access = kind === "voice" && input.access === "read-only" ? "public" : input.access;
  const letIn = kind === "voice" ? VOICE_ACCESS : TEXT_ACCESS;
  const writes: AccessWrites = { puts: [], deletes: [] };

  const write = (id: string, type: 0 | 1, allow: bigint, deny: bigint): void => {
    const existing = current?.find((o) => o.id === id && o.type === type);
    if (existing && toBits(existing.allow) === allow && toBits(existing.deny) === deny) return;
    if (allow === NONE && deny === NONE) {
      if (existing) writes.deletes.push({ id, type });
      return;
    }
    writes.puts.push({ id, type, allow: allow.toString(), deny: deny.toString() });
  };
  const bitsOf = (id: string, type: number): { allow: bigint; deny: bigint } => {
    const found = current?.find((o) => o.id === id && o.type === type);
    return { allow: toBits(found?.allow), deny: toBits(found?.deny) };
  };

  const everyone = bitsOf(everyoneId, ROLE_OVERWRITE);
  const wantedDeny = { private: PERMISSION.viewChannel, "read-only": SPEAKING, public: NONE }[
    access
  ];
  write(
    everyoneId,
    ROLE_OVERWRITE,
    everyone.allow & ~EVERYONE_MANAGED,
    (everyone.deny & ~EVERYONE_MANAGED) | wantedDeny,
  );
  if (access !== "private") return writes;

  for (const id of allowedRoleIds) {
    const role = bitsOf(id, ROLE_OVERWRITE);
    write(id, ROLE_OVERWRITE, role.allow | letIn, role.deny & ~letIn);
  }
  // Without this the bot could lock itself out of a channel it just made private.
  const bot = bitsOf(botUserId, MEMBER_OVERWRITE);
  write(botUserId, MEMBER_OVERWRITE, bot.allow | letIn, bot.deny & ~letIn);

  revokeUnwanted(current, new Set(allowedRoleIds), everyoneId, write);
  return writes;
}
