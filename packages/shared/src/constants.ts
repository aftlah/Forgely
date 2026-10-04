/** Redis pub/sub channels used for dashboard → bot sync. */
export const REDIS_CHANNELS = {
  configUpdated: "forgely:config-updated",
} as const;

/** Prefix for cached per-guild module config entries. */
export const CONFIG_CACHE_KEY_PREFIX = "forgely:config";

/**
 * Cache TTL for module config. Pub/sub delivery is not guaranteed, so a short TTL
 * guarantees a missed message heals itself.
 */
export const CONFIG_CACHE_TTL_SECONDS = 300;

/** Discord permission bit flags (as bigint) that the platform checks itself. */
export const DISCORD_PERMISSION_FLAGS = {
  administrator: 1n << 3n,
  manageGuild: 1n << 5n,
} as const;

/** Discord permission bits the bot needs, each with the feature that needs it. */
export const BOT_INVITE_PERMISSIONS = {
  viewChannels: 1n << 10n,
  sendMessages: 1n << 11n,
  readMessageHistory: 1n << 16n,
  embedLinks: 1n << 14n,
  /** /purge */
  manageMessages: 1n << 13n,
  /** /kick */
  kickMembers: 1n << 1n,
  /** /ban */
  banMembers: 1n << 2n,
  /** /timeout */
  moderateMembers: 1n << 40n,
  /** AI server builder: creating categories and channels. */
  manageChannels: 1n << 4n,
  /** AI server builder and welcome auto-roles. */
  manageRoles: 1n << 28n,
} as const;

export const NO_PERMISSIONS = 0n;
