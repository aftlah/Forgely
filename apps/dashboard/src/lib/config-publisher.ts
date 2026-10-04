import { Redis } from "ioredis";

import { configUpdatedMessageSchema, REDIS_CHANNELS } from "@forgely/shared";

import { getSettingsEnv } from "./env";
import { describeError, logWarning } from "./log";

/** How a saved change reaches the running bot. */
export type Delivery = "instant" | "delayed";

export type PublishConfigUpdate = (guildId: string, moduleId: string) => Promise<Delivery>;

/** The one Redis method we use, so tests can fake it. */
export interface RedisLike {
  publish: (channel: string, message: string) => Promise<number>;
}

/**
 * Tells the bot a module's settings changed so it drops its cached copy. Without Redis (local
 * development) nothing is sent and the bot notices on its own within its short cache lifetime,
 * which is reported as "delayed". A publish failure never fails the save: the data is already stored.
 */
export function createConfigPublisher(redis: RedisLike | null): PublishConfigUpdate {
  return async (guildId, moduleId) => {
    if (!redis) return "delayed";

    try {
      const message = configUpdatedMessageSchema.parse({ guildId, moduleId });
      await redis.publish(REDIS_CHANNELS.configUpdated, JSON.stringify(message));
      return "instant";
    } catch (error) {
      logWarning("Could not publish the config update", {
        guildId,
        moduleId,
        error: describeError(error),
      });
      return "delayed";
    }
  };
}

const globalForRedis = globalThis as unknown as { forgelyPublisher?: PublishConfigUpdate };

/** The real publisher: Redis if REDIS_URL is set, otherwise the "delayed" fallback. One per process. */
export function getConfigPublisher(): PublishConfigUpdate {
  if (!globalForRedis.forgelyPublisher) {
    const url = getSettingsEnv().REDIS_URL;
    // Fail fast instead of queueing commands while Redis is down; the save must not hang on it.
    const redis = url
      ? new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
      : null;
    redis?.on("error", (error) =>
      logWarning("Redis connection problem", { error: describeError(error) }),
    );
    globalForRedis.forgelyPublisher = createConfigPublisher(redis);
  }
  return globalForRedis.forgelyPublisher;
}
