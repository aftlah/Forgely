import type { Redis } from "ioredis";

import type { CacheStore } from "./guild-config-service";

export function createRedisCacheStore(redis: Redis): CacheStore {
  return {
    get: (key) => redis.get(key),
    set: async (key, value, ttlSeconds) => {
      await redis.set(key, value, "EX", ttlSeconds);
    },
    delete: async (key) => {
      await redis.del(key);
    },
  };
}
