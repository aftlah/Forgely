import { z } from "zod";

import { defineModuleConfig } from "../module-config";
import { snowflakeSchema } from "../snowflake";

export const LEVELING_MODULE_ID = "leveling";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_XP_PER_MESSAGE = 100;
const MAX_COOLDOWN_SECONDS = 3600;
const MAX_LEVEL = 500;
/** How many level-to-role rewards one server can have. The dashboard shows the same limit. */
export const MAX_ROLE_REWARDS = 20;

export const LEVEL_UP_MODES = ["same-channel", "channel", "off"] as const;

/** A whole number in a range, with messages a person can act on (these show next to the field). */
function wholeNumber(min: number, max: number) {
  return z
    .number({ error: "Enter a whole number." })
    .int("Enter a whole number.")
    .min(min, `Must be at least ${min}.`)
    .max(max, `Must be ${max} or less.`);
}

export const levelingConfigSchema = z
  .object({
    xp: z.object({
      /** XP is a random whole number between `min` and `max` for each counted message. */
      min: wholeNumber(1, MAX_XP_PER_MESSAGE),
      max: wholeNumber(1, MAX_XP_PER_MESSAGE),
      /** A member earns XP at most once per this many seconds, so spamming does not level anyone. */
      cooldownSeconds: wholeNumber(0, MAX_COOLDOWN_SECONDS),
    }),
    levelUp: z.object({
      mode: z.enum(LEVEL_UP_MODES),
      /** Used only when `mode` is "channel". */
      channelId: snowflakeSchema.nullable(),
      message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
    }),
    roleRewards: z
      .array(
        z.object({
          level: wholeNumber(1, MAX_LEVEL),
          roleId: snowflakeSchema,
        }),
      )
      .max(MAX_ROLE_REWARDS),
  })
  .superRefine((config, context) => {
    if (config.xp.max < config.xp.min) {
      context.addIssue({
        code: "custom",
        path: ["xp", "max"],
        message: "The maximum can't be lower than the minimum.",
      });
    }
    if (config.levelUp.mode === "channel" && config.levelUp.channelId === null) {
      context.addIssue({
        code: "custom",
        path: ["levelUp", "channelId"],
        message: "Choose a channel for level-up messages.",
      });
    }
    const levels = config.roleRewards.map((reward) => reward.level);
    if (new Set(levels).size !== levels.length) {
      context.addIssue({
        code: "custom",
        path: ["roleRewards"],
        message: "Each level can have only one role reward.",
      });
    }
  });

export type LevelingConfig = z.infer<typeof levelingConfigSchema>;

/** Placeholders the level-up message understands. Shown in the dashboard editor. */
export const LEVELING_TEMPLATE_VARIABLES = ["user", "username", "level", "server"] as const;

export const levelingModuleConfig = defineModuleConfig({
  moduleId: LEVELING_MODULE_ID,
  version: 1,
  schema: levelingConfigSchema,
  defaults: {
    xp: { min: 15, max: 25, cooldownSeconds: 60 },
    levelUp: {
      mode: "same-channel",
      channelId: null,
      message: "GG {user}, you reached level {level}!",
    },
    roleRewards: [],
  },
});
