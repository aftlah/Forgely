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
