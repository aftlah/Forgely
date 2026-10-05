import type { ChannelKind, ExistingItem, ServerSnapshot } from "@forgely/ai";

import type { DiscordGuildRest, GuildChannel, GuildRole } from "@/lib/discord-guild-rest";

/** Discord channel type numbers the builder cares about. */
export const CHANNEL_TYPE = {
  text: 0,
  voice: 2,
  category: 4,
  announcement: 5,
  forum: 15,
} as const;

const REF_PREFIX = { role: "r", category: "k", channel: "h" } as const;

const KIND_BY_TYPE = new Map<number, ChannelKind>([
  [CHANNEL_TYPE.text, "text"],
  [CHANNEL_TYPE.voice, "voice"],
  [CHANNEL_TYPE.announcement, "announcement"],
  [CHANNEL_TYPE.forum, "forum"],
]);

/** What the builder knows about a server right now: names for the AI, raw lists for applying. */
export interface ServerState {
  snapshot: ServerSnapshot;
  roles: GuildRole[];
  channels: GuildChannel[];
}

/**
 * Lists every role, category, and channel with a short ref and whether it may be deleted. A role is
 * protected when an integration owns it (`managed`, which includes the Forgely bot's own role), and
 * anything unclear is protected too. A channel is protected when Discord relies on it or when it is a
 * type the builder does not understand.
 */
export function buildExistingItems(
  guildId: string,
  channels: GuildChannel[],
  roles: GuildRole[],
  specialChannelIds: ReadonlySet<string>,
): ExistingItem[] {
  const categoryNames = new Map(
    channels
      .filter((channel) => channel.type === CHANNEL_TYPE.category)
      .map((channel) => [channel.id, channel.name]),
  );
  const items: ExistingItem[] = [];
  const next = { role: 0, category: 0, channel: 0 };
  const add = (kind: ExistingItem["kind"], item: Omit<ExistingItem, "ref" | "kind">): void => {
    next[kind] += 1;
    items.push({ ...item, kind, ref: `${REF_PREFIX[kind]}${next[kind]}` });
  };

  for (const role of roles.filter((candidate) => candidate.id !== guildId)) {
    // Only an explicit `false` counts as hand-made; a missing answer is treated as protected.
    add("role", {
      id: role.id,
      name: role.name,
      parentName: null,
      isProtected: role.managed !== false,
    });
  }
  for (const channel of channels) {
    const isCategory = channel.type === CHANNEL_TYPE.category;
    const isKnown = isCategory || KIND_BY_TYPE.has(channel.type);
    add(isCategory ? "category" : "channel", {
      id: channel.id,
      name: channel.name,
      parentName: categoryNames.get(channel.parent_id ?? "") ?? null,
      isProtected: !isKnown || specialChannelIds.has(channel.id),
    });
  }
  return items;
}

/**
 * Reduces channels and roles to names and structure. Topics, message content, and member names are
 * never read, so nothing a member wrote can reach the AI.
 */
export function buildSnapshot(
  guildId: string,
  channels: GuildChannel[],
  roles: GuildRole[],
  specialChannelIds: ReadonlySet<string> = new Set(),
): ServerSnapshot {
  const categories = channels.filter((channel) => channel.type === CHANNEL_TYPE.category);
  const children = (parentId: string | null): ServerSnapshot["categories"][number]["channels"] =>
    channels
      .filter((channel) => channel.type !== CHANNEL_TYPE.category)
      .filter((channel) => (channel.parent_id ?? null) === parentId)
      .map((channel) => ({ name: channel.name, kind: KIND_BY_TYPE.get(channel.type) ?? "other" }));

  const loose = children(null);
  return {
    // @everyone's ID is the guild's ID; it is not a role anyone would plan around.
    roles: roles.filter((role) => role.id !== guildId).map((role) => role.name),
    categories: [
      ...categories.map((category) => ({ name: category.name, channels: children(category.id) })),
      ...(loose.length > 0 ? [{ name: null, channels: loose }] : []),
    ],
    items: buildExistingItems(guildId, channels, roles, specialChannelIds),
  };
}

export async function loadServerState(
  rest: DiscordGuildRest,
  guildId: string,
): Promise<ServerState> {
  const [channels, roles, specialIds] = await Promise.all([
    rest.listChannels(guildId),
    rest.listRoles(guildId),
    rest.listSpecialChannelIds(guildId),
  ]);
  const snapshot = buildSnapshot(guildId, channels, roles, new Set(specialIds));
  return { snapshot, roles, channels };
}
