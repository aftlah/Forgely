export interface RateLimiter {
  /** Returns true if the caller may proceed, false if they hit the limit for this window. */
  tryAcquire: (key: string) => boolean;
}

/**
 * Fixed-window limiter, kept in memory. It stops a runaway client or script from hammering a
 * Server Action. It is per server process, which is enough for a single instance.
 */
export function createRateLimiter(
  maxPerWindow: number,
  windowMs: number,
  now: () => number = Date.now,
): RateLimiter {
  const windows = new Map<string, { startedAt: number; count: number }>();

  return {
    tryAcquire(key) {
      const current = now();
      const window = windows.get(key);

      if (!window || current - window.startedAt >= windowMs) {
        windows.set(key, { startedAt: current, count: 1 });
        return true;
      }
      if (window.count >= maxPerWindow) return false;

      window.count += 1;
      return true;
    },
  };
}
