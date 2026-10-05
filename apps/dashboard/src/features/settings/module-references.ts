import {
  levelingConfigSchema,
  moderationConfigSchema,
  rolePanelsConfigSchema,
  ticketsConfigSchema,
  welcomeConfigSchema,
  type ConfigurableModuleId,
} from "@forgely/shared";

/** The Discord IDs a module's settings point at. Used to check they belong to the server. */
export interface ConfigReferences {
  channelIds: string[];
  roleIds: string[];
}

const NO_REFERENCES: ConfigReferences = { channelIds: [], roleIds: [] };

function present(ids: Array<string | null>): string[] {
  return ids.filter((id): id is string => id !== null);
}

/**
 * One extractor per module. Typed as a full `Record`, so adding a module to `MODULE_CONFIGS` without
 * adding it here is a compile error instead of a silently unchecked setting.
 * Each returns nothing for data that does not match the schema, so stored data can never crash it.
 */
const EXTRACTORS: Record<ConfigurableModuleId, (config: unknown) => ConfigReferences> = {
  welcome(config) {
    const parsed = welcomeConfigSchema.safeParse(config);
    if (!parsed.success) return NO_REFERENCES;
    const { welcome, goodbye, autoRoleIds } = parsed.data;
    return { channelIds: present([welcome.channelId, goodbye.channelId]), roleIds: autoRoleIds };
  },

  moderation(config) {
    const parsed = moderationConfigSchema.safeParse(config);
    if (!parsed.success) return NO_REFERENCES;
    return { channelIds: present([parsed.data.modLogChannelId]), roleIds: [] };
  },

  "role-panels"(config) {
    const parsed = rolePanelsConfigSchema.safeParse(config);
    if (!parsed.success) return NO_REFERENCES;
    const { panels } = parsed.data;
    return {
      channelIds: present(panels.map((panel) => panel.channelId)),
      roleIds: [
        ...new Set(panels.flatMap((panel) => panel.buttons.map((button) => button.roleId))),
      ],
    };
  },

  leveling(config) {
    const parsed = levelingConfigSchema.safeParse(config);
    if (!parsed.success) return NO_REFERENCES;
    const { levelUp, roleRewards } = parsed.data;
    return {
      channelIds: present([levelUp.channelId]),
      roleIds: roleRewards.map((reward) => reward.roleId),
    };
  },

  tickets(config) {
    const parsed = ticketsConfigSchema.safeParse(config);
    if (!parsed.success) return NO_REFERENCES;
    const { categoryId, logChannelId, supportRoleIds, panel } = parsed.data;
    // A category is a channel as far as Discord's API is concerned.
    return {
      channelIds: present([categoryId, logChannelId, panel.channelId]),
      roleIds: supportRoleIds,
    };
  },
};

/** Lists the channels and roles a module's config refers to. */
export function getConfigReferences(
  moduleId: ConfigurableModuleId,
  config: unknown,
): ConfigReferences {
  return EXTRACTORS[moduleId](config);
}
