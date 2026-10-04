import { z } from "zod";

import { defineModuleConfig } from "../module-config";
import { snowflakeSchema } from "../snowflake";

export const WELCOME_MODULE_ID = "welcome";

/** Discord's message length limit. */
const MAX_MESSAGE_LENGTH = 2000;
const MAX_AUTO_ROLES = 10;

const messageSchema = z.string().min(1).max(MAX_MESSAGE_LENGTH);

export const welcomeConfigSchema = z.object({
  welcome: z.object({
    /** Null means "do not post a welcome message". */
    channelId: snowflakeSchema.nullable(),
    message: messageSchema,
  }),
  dm: z.object({
    isEnabled: z.boolean(),
    message: messageSchema,
  }),
  autoRoleIds: z.array(snowflakeSchema).max(MAX_AUTO_ROLES),
  goodbye: z.object({
    /** Null means "do not post a goodbye message". */
    channelId: snowflakeSchema.nullable(),
    message: messageSchema,
  }),
});

export type WelcomeConfig = z.infer<typeof welcomeConfigSchema>;

/** Placeholders the welcome and goodbye messages understand. Shown in the dashboard editor. */
export const WELCOME_TEMPLATE_VARIABLES = ["user", "username", "server", "memberCount"] as const;

export const welcomeModuleConfig = defineModuleConfig({
  moduleId: WELCOME_MODULE_ID,
  version: 1,
  schema: welcomeConfigSchema,
  defaults: {
    welcome: {
      channelId: null,
      message: "Welcome to {server}, {user}! You are member #{memberCount}.",
    },
    dm: {
      isEnabled: false,
      message: "Welcome to {server}! Have a look at the rules channel to get started.",
    },
    autoRoleIds: [],
    goodbye: {
      channelId: null,
      message: "{username} has left {server}.",
    },
  },
});
