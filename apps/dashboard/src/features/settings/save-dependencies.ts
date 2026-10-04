import { createGuildConfigRepository, createModuleSettingsRepository } from "@forgely/db";

import { loadGuildResources } from "./guild-resources";
import type { SaveDependencies } from "./save-module-settings";

import { getConfigPublisher } from "@/lib/config-publisher";
import { getDatabase } from "@/lib/db";

/** The real implementations behind `saveModuleSettings`. Tests pass fakes instead. */
export function createSaveDependencies(): SaveDependencies {
  const db = getDatabase();
  return {
    findStored: (guildId, moduleId) =>
      createGuildConfigRepository(db).findModuleConfig(guildId, moduleId),
    saveWithAudit: (input) => createModuleSettingsRepository(db).saveWithAudit(input),
    loadResources: loadGuildResources,
    publish: getConfigPublisher(),
  };
}
