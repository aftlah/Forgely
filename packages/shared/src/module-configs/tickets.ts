import { z } from "zod";

import { defineModuleConfig } from "../module-config";
import { snowflakeSchema } from "../snowflake";

export const TICKETS_MODULE_ID = "tickets";

export const MAX_SUPPORT_ROLES = 5;
export const MAX_OPEN_TICKETS_PER_USER = 5;
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_BUTTON_LABEL_LENGTH = 80;

const panelSchema = z.object({
  /** Where the "open a ticket" message should be posted. Null until the owner picks a channel. */
  channelId: snowflakeSchema.nullable(),
  title: z
    .string()
    .min(1, "Give the panel a title.")
    .max(MAX_TITLE_LENGTH, `Keep the title under ${MAX_TITLE_LENGTH} characters.`),
  description: z.string().max(MAX_DESCRIPTION_LENGTH, "That description is too long."),
  buttonLabel: z
    .string()
    .min(1, "Give the button a label.")
    .max(MAX_BUTTON_LABEL_LENGTH, `Keep the label under ${MAX_BUTTON_LABEL_LENGTH} characters.`),
  /** The message currently posted, if any. Written by the dashboard when it posts. */
  message: z.object({ channelId: snowflakeSchema, messageId: snowflakeSchema }).nullable(),
});

export const ticketsConfigSchema = z.object({
  /** The category new ticket channels are created in. Null until the owner picks one. */
  categoryId: snowflakeSchema.nullable(),
  /** Roles that can see and answer every ticket. */
  supportRoleIds: z
    .array(snowflakeSchema)
    .max(MAX_SUPPORT_ROLES)
    .refine((ids) => new Set(ids).size === ids.length, "Each role can be listed only once."),
  /** Where "ticket opened / closed" notes go. Null turns them off. */
  logChannelId: snowflakeSchema.nullable(),
  maxOpenPerUser: z.number().int().min(1).max(MAX_OPEN_TICKETS_PER_USER),
  panel: panelSchema,
});

export type TicketsConfig = z.infer<typeof ticketsConfigSchema>;

export const ticketsModuleConfig = defineModuleConfig({
  moduleId: TICKETS_MODULE_ID,
  version: 1,
  schema: ticketsConfigSchema,
  defaults: {
    categoryId: null,
    supportRoleIds: [],
    logChannelId: null,
    maxOpenPerUser: 1,
    panel: {
      channelId: null,
      title: "Need help?",
      description: "Press the button to open a private channel with our team.",
      buttonLabel: "Open a ticket",
      message: null,
    },
  },
});

/** First part of every ticket button's custom ID. The bot routes button clicks by this prefix. */
export const TICKET_BUTTON_PREFIX = "tk";
export const TICKET_OPEN_ACTION = "open";
export const TICKET_CLOSE_ACTION = "close";

/** The close button sits inside the ticket channel, so the channel itself identifies the ticket. */
export function buildTicketButtonId(
  action: typeof TICKET_OPEN_ACTION | typeof TICKET_CLOSE_ACTION,
): string {
  return `${TICKET_BUTTON_PREFIX}:${action}`;
}
