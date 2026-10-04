import type { z } from "zod";

import { createGuildConfigRepository } from "@forgely/db";
import {
  MODULE_CONFIGS,
  parseStoredConfig,
  type ConfigurableModuleId,
  type ModuleConfigDefinition,
} from "@forgely/shared";

import { getDatabase } from "@/lib/db";

export interface LoadedSettings<TModuleId extends ConfigurableModuleId> {
  isEnabled: boolean;
  config: z.infer<(typeof MODULE_CONFIGS)[TModuleId]["schema"]>;
}

/**
 * The module's current settings for a server, as the bot would read them: stored values upgraded to
 * the current schema version, or the defaults (module off) when nothing is stored yet.
 */
export async function loadModuleSettings<TModuleId extends ConfigurableModuleId>(
  guildId: string,
  moduleId: TModuleId,
): Promise<LoadedSettings<TModuleId>> {
  // The lookup returns a union of the module definitions, which TypeScript cannot pass to a generic
  // function directly. Every definition has the same shape, so widening it here is safe.
  const definition: ModuleConfigDefinition<z.ZodType> = MODULE_CONFIGS[moduleId];
  const stored = await createGuildConfigRepository(getDatabase()).findModuleConfig(
    guildId,
    moduleId,
  );

  return {
    isEnabled: stored?.isEnabled ?? false,
    config: parseStoredConfig(
      definition,
      stored && { version: stored.configVersion, config: stored.config },
    ),
  } as LoadedSettings<TModuleId>;
}
