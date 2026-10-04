import { z } from "zod";

import { defineModuleConfig } from "../module-config";
import { snowflakeSchema } from "../snowflake";

export const MODERATION_MODULE_ID = "moderation";

export const moderationConfigSchema = z.object({
  /** Null means "do not post cases to a channel". Cases are always stored either way. */
  modLogChannelId: snowflakeSchema.nullable(),
  /** Whether to DM the member about the action taken against them. */
  notifyUserByDm: z.boolean(),
});

export type ModerationConfig = z.infer<typeof moderationConfigSchema>;

export const moderationModuleConfig = defineModuleConfig({
  moduleId: MODERATION_MODULE_ID,
  version: 1,
  schema: moderationConfigSchema,
  defaults: { modLogChannelId: null, notifyUserByDm: true },
});
