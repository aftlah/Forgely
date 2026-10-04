import { and, eq } from "drizzle-orm";

import type { Database } from "../client";
import { guildModuleConfigs } from "../schema";

export interface StoredModuleConfig {
  isEnabled: boolean;
  configVersion: number;
  config: unknown;
}

export interface SaveModuleConfigInput extends StoredModuleConfig {
  guildId: string;
  moduleId: string;
  updatedBy?: string;
}

export interface ModuleState {
  moduleId: string;
  isEnabled: boolean;
}

export interface GuildConfigRepository {
  findModuleConfig: (guildId: string, moduleId: string) => Promise<StoredModuleConfig | undefined>;
  saveModuleConfig: (input: SaveModuleConfigInput) => Promise<void>;
  /** Which modules have a stored row for the guild, and whether each is on. */
  listModuleStates: (guildId: string) => Promise<ModuleState[]>;
}

export function createGuildConfigRepository(db: Database): GuildConfigRepository {
  return {
    async findModuleConfig(guildId, moduleId) {
      const [row] = await db
        .select()
        .from(guildModuleConfigs)
        .where(
          and(eq(guildModuleConfigs.guildId, guildId), eq(guildModuleConfigs.moduleId, moduleId)),
        )
        .limit(1);
      if (!row) return undefined;
      return { isEnabled: row.isEnabled, configVersion: row.configVersion, config: row.config };
    },

    listModuleStates(guildId) {
      return db
        .select({ moduleId: guildModuleConfigs.moduleId, isEnabled: guildModuleConfigs.isEnabled })
        .from(guildModuleConfigs)
        .where(eq(guildModuleConfigs.guildId, guildId));
    },

    async saveModuleConfig({ guildId, moduleId, isEnabled, configVersion, config, updatedBy }) {
      const values = { isEnabled, configVersion, config, updatedBy, updatedAt: new Date() };
      await db
        .insert(guildModuleConfigs)
        .values({ guildId, moduleId, ...values })
        .onConflictDoUpdate({
          target: [guildModuleConfigs.guildId, guildModuleConfigs.moduleId],
          set: values,
        });
    },
  };
}
