import type { CacheStore } from "./guild-config-service";

const MILLISECONDS_PER_SECOND = 1000;

/**
 * In-process cache with expiry, used when Redis is not configured (local development).
 * It is not shared between processes, so it must not be used with multiple shards.
 */
export function createMemoryCacheStore(now: () => number = Date.now): CacheStore {
  const entries = new Map<string, { value: string; expiresAt: number }>();

  return {
    get: async (key) => {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },
    set: async (key, value, ttlSeconds) => {
      entries.set(key, { value, expiresAt: now() + ttlSeconds * MILLISECONDS_PER_SECOND });
    },
    delete: async (key) => {
      entries.delete(key);
    },
  };
}
