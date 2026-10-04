import type { z } from "zod";

/**
 * Describes the stored shape of one module's per-guild config.
 * Bump `version` and add an entry to `upgrades` whenever the schema changes shape.
 */
export interface ModuleConfigDefinition<TSchema extends z.ZodType> {
  readonly moduleId: string;
  readonly version: number;
  readonly schema: TSchema;
  readonly defaults: z.infer<TSchema>;
  /** Maps config stored at version N to version N + 1. Keyed by the old version. */
  readonly upgrades?: Readonly<Record<number, (oldConfig: unknown) => unknown>>;
}

export function defineModuleConfig<TSchema extends z.ZodType>(
  definition: ModuleConfigDefinition<TSchema>,
): ModuleConfigDefinition<TSchema> {
  return definition;
}

/**
 * Upgrades a stored config to the definition's current version, then validates it.
 * Falls back to defaults when stored data is unusable, so a bad row never breaks a guild.
 */
export function parseStoredConfig<TSchema extends z.ZodType>(
  definition: ModuleConfigDefinition<TSchema>,
  stored: { version: number; config: unknown } | undefined,
): z.infer<TSchema> {
  if (!stored) return definition.defaults;

  let config = stored.config;
  for (let version = stored.version; version < definition.version; version += 1) {
    const upgrade = definition.upgrades?.[version];
    if (!upgrade) return definition.defaults;
    config = upgrade(config);
  }

  const result = definition.schema.safeParse(config);
  return result.success ? result.data : definition.defaults;
}
