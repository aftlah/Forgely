import * as Sentry from "@sentry/node";
import { Redis } from "ioredis";

import {
  createDatabase,
  createGuildConfigRepository,
  createGuildRepository,
  type GuildConfigRepository,
} from "@forgely/db";

import type { BotEnv } from "../config/env";
import { botModules } from "../modules";
import { startConfigSubscriber } from "../sync/config-subscriber";
import { createGuildConfigService, type GuildConfigService } from "../sync/guild-config-service";
import { createMemoryCacheStore } from "../sync/memory-cache-store";
import { createRedisCacheStore } from "../sync/redis-cache-store";

import { createLogger, type Logger } from "./logger";
import { createModuleRegistry, type ModuleRegistry } from "./module-registry";
import type { AppContext } from "./types";

const MEMORY_CACHE_TTL_SECONDS = 10;

export interface BotApp {
  context: AppContext;
  registry: ModuleRegistry;
  /** Closes the database pool and Redis connections. */
  shutdown: () => Promise<void>;
}

/**
 * Builds the config service. With Redis it caches there and listens for dashboard changes;
 * without it (local development) it caches in memory and there is nothing to listen to.
 */
async function createGuildConfig(
  env: BotEnv,
  deps: { repository: GuildConfigRepository; logger: Logger },
): Promise<{ guildConfig: GuildConfigService; closeCache: () => void }> {
  const { repository, logger } = deps;

  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL is not set: using an in-memory config cache (development only)");
    // Short TTL: without pub/sub, this is the only way an outside config change gets noticed.
    const guildConfig = createGuildConfigService({
      repository,
      cache: createMemoryCacheStore(),
      logger,
      cacheTtlSeconds: MEMORY_CACHE_TTL_SECONDS,
    });
    return { guildConfig, closeCache: () => undefined };
  }

  const redis = new Redis(env.REDIS_URL);
  const subscriber = redis.duplicate();
  const guildConfig = createGuildConfigService({
    repository,
    cache: createRedisCacheStore(redis),
    logger,
  });
  await startConfigSubscriber({ subscriber, guildConfig, logger });

  return {
    guildConfig,
    closeCache: () => {
      subscriber.disconnect();
      redis.disconnect();
    },
  };
}

/**
 * Composition root: the only place that wires concrete implementations together.
 * Everything else receives its dependencies as parameters, which keeps it testable.
 */
export async function createApp(env: BotEnv): Promise<BotApp> {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
  const logger = createLogger(env);

  const database = createDatabase(env.DATABASE_URL);
  const { guildConfig, closeCache } = await createGuildConfig(env, {
    repository: createGuildConfigRepository(database.db),
    logger,
  });

  return {
    context: {
      logger,
      db: database.db,
      guildConfig,
      guildRepository: createGuildRepository(database.db),
    },
    registry: createModuleRegistry(botModules),
    shutdown: async () => {
      closeCache();
      await database.close();
      await Sentry.close();
    },
  };
}
