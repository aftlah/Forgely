import { z } from "zod";

import { snowflakeSchema } from "./snowflake";

/** Published by the dashboard after saving a module config; consumed by the bot. */
export const configUpdatedMessageSchema = z.object({
  guildId: snowflakeSchema,
  moduleId: z.string().min(1),
});

export type ConfigUpdatedMessage = z.infer<typeof configUpdatedMessageSchema>;
