import { levelingModuleConfig } from "./leveling";
import { moderationModuleConfig } from "./moderation";
import { rolePanelsModuleConfig } from "./role-panels";
import { welcomeModuleConfig } from "./welcome";

/**
 * Every module that has per-server settings, by id. The dashboard looks a module up here to
 * validate what a user submits with the very same schema the bot uses to read it.
 */
export const MODULE_CONFIGS = {
  // Keys are written out so `ConfigurableModuleId` stays a precise union. A test checks each key
  // equals its definition's moduleId.
  leveling: levelingModuleConfig,
  moderation: moderationModuleConfig,
  "role-panels": rolePanelsModuleConfig,
  welcome: welcomeModuleConfig,
} as const;

export type ConfigurableModuleId = keyof typeof MODULE_CONFIGS;

export function isConfigurableModuleId(moduleId: string): moduleId is ConfigurableModuleId {
  return Object.hasOwn(MODULE_CONFIGS, moduleId);
}
