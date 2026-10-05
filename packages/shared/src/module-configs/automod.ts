import { z } from "zod";

import { defineModuleConfig } from "../module-config";
import { snowflakeSchema } from "../snowflake";

export const AUTOMOD_MODULE_ID = "automod";

/** Discord's own limits for one keyword rule. */
export const MAX_BLOCKED_WORDS = 100;
export const MAX_WORD_LENGTH = 60;
export const MAX_EXEMPT_ROLES = 10;
export const MIN_MENTION_LIMIT = 2;
export const MAX_MENTION_LIMIT = 50;
/** Discord allows a timeout of at most four weeks. */
export const MAX_TIMEOUT_SECONDS = 2_419_200;

const wordSchema = z
  .string()
  .trim()
  .min(1, "A blocked word can't be empty.")
  .max(MAX_WORD_LENGTH, `Keep each word under ${MAX_WORD_LENGTH} characters.`);

/**
 * Forgely does not scan messages itself. It turns these settings into Discord's own AutoMod rules, so Discord
 * does the detecting and blocking, with no privileged intent and no cost when the bot is offline.
 */
export const automodConfigSchema = z
  .object({
    /** Words or phrases that block a message. Discord matches them case-insensitively, and `*` works as a wildcard. */
    blockedWords: z
      .array(wordSchema)
      .max(MAX_BLOCKED_WORDS, `Up to ${MAX_BLOCKED_WORDS} words.`)
      .refine(
        (words) => new Set(words.map((word) => word.toLowerCase())).size === words.length,
        "Each word can be listed only once.",
      ),
    blockInvites: z.boolean(),
    blockSpam: z.boolean(),
    /** Discord's ready-made word lists. */
    presets: z.object({
      profanity: z.boolean(),
      sexualContent: z.boolean(),
      slurs: z.boolean(),
    }),
    /** Messages that mention more than this many people are blocked. Null turns the rule off. */
    mentionLimit: z
      .number()
      .int()
      .min(MIN_MENTION_LIMIT, `At least ${MIN_MENTION_LIMIT}.`)
      .max(MAX_MENTION_LIMIT, `At most ${MAX_MENTION_LIMIT}.`)
      .nullable(),
    /** Where Discord posts a note when a message is blocked. Null posts nothing. */
    alertChannelId: snowflakeSchema.nullable(),
    /** Also time the member out. Applies to the words and mention rules, the two Discord allows it on. */
    timeoutSeconds: z.number().int().min(1).max(MAX_TIMEOUT_SECONDS).nullable(),
    /** Roles the rules ignore, such as moderators. */
    exemptRoleIds: z.array(snowflakeSchema).max(MAX_EXEMPT_ROLES),
  })
  .refine((config) => new Set(config.exemptRoleIds).size === config.exemptRoleIds.length, {
    path: ["exemptRoleIds"],
    message: "Each role can be listed only once.",
  });

export type AutomodConfig = z.infer<typeof automodConfigSchema>;

export const automodModuleConfig = defineModuleConfig({
  moduleId: AUTOMOD_MODULE_ID,
  version: 1,
  schema: automodConfigSchema,
  defaults: {
    blockedWords: [],
    blockInvites: false,
    blockSpam: true,
    presets: { profanity: false, sexualContent: false, slurs: true },
    mentionLimit: 10,
    alertChannelId: null,
    timeoutSeconds: null,
    exemptRoleIds: [],
  },
});
