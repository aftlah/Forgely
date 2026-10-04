import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { defineModuleConfig } from "@forgely/shared";

import { createSilentLogger } from "../testing/silent-logger";

import { createGuildConfigService, type CacheStore } from "./guild-config-service";

const definition = defineModuleConfig({
  moduleId: "example",
  version: 1,
  schema: z.object({ greeting: z.string() }),
  defaults: { greeting: "hello" },
});

const GUILD_ID = "111111111111111111";

function createMemoryCache(): CacheStore & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    get: async (key) => entries.get(key) ?? null,
    set: async (key, value) => void entries.set(key, value),
    delete: async (key) => void entries.delete(key),
  };
}

function setup(stored?: { isEnabled: boolean; configVersion: number; config: unknown }) {
  const repository = { findModuleConfig: vi.fn(async () => stored) };
  const cache = createMemoryCache();
  const service = createGuildConfigService({ repository, cache, logger: createSilentLogger() });
  return { repository, cache, service };
}

describe("createGuildConfigService", () => {
  it("returns a disabled module with defaults when nothing is stored", async () => {
    const { service } = setup();

    const state = await service.getModuleState(GUILD_ID, definition);

    expect(state).toEqual({ isEnabled: false, config: { greeting: "hello" } });
  });

  it("reads from the database once, then serves from cache", async () => {
    const { service, repository } = setup({
      isEnabled: true,
      configVersion: 1,
      config: { greeting: "hi" },
    });

    await service.getModuleState(GUILD_ID, definition);
    const second = await service.getModuleState(GUILD_ID, definition);

    expect(second).toEqual({ isEnabled: true, config: { greeting: "hi" } });
    expect(repository.findModuleConfig).toHaveBeenCalledTimes(1);
  });

  it("reloads from the database after invalidate", async () => {
    const { service, repository } = setup({
      isEnabled: true,
      configVersion: 1,
      config: { greeting: "hi" },
    });

    await service.getModuleState(GUILD_ID, definition);
    await service.invalidate(GUILD_ID, definition.moduleId);
    await service.getModuleState(GUILD_ID, definition);

    expect(repository.findModuleConfig).toHaveBeenCalledTimes(2);
  });

  it("ignores a corrupt cache entry and falls back to the database", async () => {
    const { service, cache, repository } = setup({
      isEnabled: true,
      configVersion: 1,
      config: { greeting: "hi" },
    });
    cache.entries.set(`forgely:config:${GUILD_ID}:example`, "{not json");

    const state = await service.getModuleState(GUILD_ID, definition);

    expect(state.config).toEqual({ greeting: "hi" });
    expect(repository.findModuleConfig).toHaveBeenCalledTimes(1);
  });

  it("keeps the enabled flag but uses defaults when stored config is invalid", async () => {
    const { service } = setup({ isEnabled: true, configVersion: 1, config: { greeting: 42 } });

    const state = await service.getModuleState(GUILD_ID, definition);

    expect(state).toEqual({ isEnabled: true, config: { greeting: "hello" } });
  });
});
