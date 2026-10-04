import { and, eq } from "drizzle-orm";

import type { Database } from "../client";
import { auditLog, guildModuleConfigs } from "../schema";

export interface SaveModuleSettingsInput {
  guildId: string;
  moduleId: string;
  /** Discord ID of the dashboard user making the change. */
  actorId: string;
  isEnabled: boolean;
  configVersion: number;
  config: unknown;
}

export interface ModuleSettingsRepository {
  /**
   * Stores the module's settings and records who changed what in the audit log, in one
   * transaction: either both happen or neither does.
   */
  saveWithAudit: (input: SaveModuleSettingsInput) => Promise<void>;
}

export function createModuleSettingsRepository(db: Database): ModuleSettingsRepository {
  return {
    async saveWithAudit({ guildId, moduleId, actorId, isEnabled, configVersion, config }) {
      await db.transaction(async (transaction) => {
        const [previous] = await transaction
          .select()
          .from(guildModuleConfigs)
          .where(
            and(eq(guildModuleConfigs.guildId, guildId), eq(guildModuleConfigs.moduleId, moduleId)),
          )
          .limit(1);

        const values = {
          isEnabled,
          configVersion,
          config,
          updatedBy: actorId,
          updatedAt: new Date(),
        };
        await transaction
          .insert(guildModuleConfigs)
          .values({ guildId, moduleId, ...values })
          .onConflictDoUpdate({
            target: [guildModuleConfigs.guildId, guildModuleConfigs.moduleId],
            set: values,
          });

        await transaction.insert(auditLog).values({
          guildId,
          actorId,
          action: `module.${moduleId}.updated`,
          before: previous ? { isEnabled: previous.isEnabled, config: previous.config } : null,
          after: { isEnabled, config },
        });
      });
    },
  };
}
