import { automodModuleConfig } from "./automod";
import { levelingModuleConfig } from "./leveling";
import { moderationModuleConfig } from "./moderation";
import { rolePanelsModuleConfig } from "./role-panels";
import { ticketsModuleConfig } from "./tickets";
import { welcomeModuleConfig } from "./welcome";

/**
 * Every module that has per-server settings, by id. The dashboard looks a module up here to
 * validate what a user submits with the very same schema the bot uses to read it.
 */
export const MODULE_CONFIGS = {
  // Keys are written out so `ConfigurableModuleId` stays a precise union. A test checks each key
  // equals its definition's moduleId.
  automod: automodModuleConfig,
  leveling: levelingModuleConfig,
  moderation: moderationModuleConfig,
  "role-panels": rolePanelsModuleConfig,
  tickets: ticketsModuleConfig,
  welcome: welcomeModuleConfig,
} as const;

export type ConfigurableModuleId = keyof typeof MODULE_CONFIGS;

export function isConfigurableModuleId(moduleId: string): moduleId is ConfigurableModuleId {
  return Object.hasOwn(MODULE_CONFIGS, moduleId);
}
