export interface TtlCache<T> {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
}

/**
 * Tiny in-process cache whose entries expire. Used so a page that lists a user's servers does not
 * hit Discord's rate limit on every navigation. Per server process, which is fine for short TTLs.
 */
export function createTtlCache<T>(ttlMs: number, now: () => number = Date.now): TtlCache<T> {
  const entries = new Map<string, { value: T; expiresAt: number }>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },
  };
}
