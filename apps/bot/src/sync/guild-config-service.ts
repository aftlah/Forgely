import type { z } from "zod";

import type { GuildConfigRepository } from "@forgely/db";
import {
  CONFIG_CACHE_KEY_PREFIX,
  CONFIG_CACHE_TTL_SECONDS,
  parseStoredConfig,
  type ModuleConfigDefinition,
} from "@forgely/shared";

import type { Logger } from "../core/logger";

/** The few cache operations the service needs. Redis implements it; tests use a Map. */
export interface CacheStore {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export interface ModuleState<TConfig> {
  isEnabled: boolean;
  config: TConfig;
}

export interface GuildConfigService {
  /** Resolves a module's enabled flag and validated config for one guild (cache → DB → defaults). */
  getModuleState: <TSchema extends z.ZodType>(
    guildId: string,
    definition: ModuleConfigDefinition<TSchema>,
  ) => Promise<ModuleState<z.infer<TSchema>>>;
  /** Drops the cached entry so the next read reloads from the database. */
  invalidate: (guildId: string, moduleId: string) => Promise<void>;
}

interface Dependencies {
  repository: Pick<GuildConfigRepository, "findModuleConfig">;
  cache: CacheStore;
  logger: Logger;
  /** How long a cached entry lives. Defaults to the shared production value. */
  cacheTtlSeconds?: number;
}

function buildCacheKey(guildId: string, moduleId: string): string {
  return `${CONFIG_CACHE_KEY_PREFIX}:${guildId}:${moduleId}`;
}

/** Returns the cached state, or undefined if it is missing or no longer valid. */
async function readCachedState<TSchema extends z.ZodType>(
  { cache, logger }: Pick<Dependencies, "cache" | "logger">,
  key: string,
  definition: ModuleConfigDefinition<TSchema>,
): Promise<ModuleState<z.infer<TSchema>> | undefined> {
  const raw = await cache.get(key);
  if (raw === null) return undefined;

  try {
    const parsed = JSON.parse(raw) as { isEnabled?: unknown; config?: unknown };
    const config = definition.schema.safeParse(parsed.config);
    if (typeof parsed.isEnabled !== "boolean" || !config.success) return undefined;
    return { isEnabled: parsed.isEnabled, config: config.data };
  } catch (error) {
    logger.warn({ err: error, key }, "Discarding unreadable config cache entry");
    return undefined;
  }
}

export function createGuildConfigService(dependencies: Dependencies): GuildConfigService {
  const { repository, cache, cacheTtlSeconds = CONFIG_CACHE_TTL_SECONDS } = dependencies;

  return {
    async getModuleState(guildId, definition) {
      const key = buildCacheKey(guildId, definition.moduleId);
      const cached = await readCachedState(dependencies, key, definition);
      if (cached) return cached;

      const stored = await repository.findModuleConfig(guildId, definition.moduleId);
      const state = {
        isEnabled: stored?.isEnabled ?? false,
        config: parseStoredConfig(
          definition,
          stored && { version: stored.configVersion, config: stored.config },
        ),
      };
      await cache.set(key, JSON.stringify(state), cacheTtlSeconds);
      return state;
    },

    async invalidate(guildId, moduleId) {
      await cache.delete(buildCacheKey(guildId, moduleId));
    },
  };
}
