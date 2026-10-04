import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { guilds, SNOWFLAKE_LENGTH } from "./guilds";

export const MOD_CASE_TYPES = ["ban", "kick", "timeout", "warn", "purge"] as const;

export const modCaseType = pgEnum("mod_case_type", MOD_CASE_TYPES);

/** One row per moderation action. Warnings are cases of type `warn`. */
export const modCases = pgTable(
  "mod_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: varchar("guild_id", { length: SNOWFLAKE_LENGTH })
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    /** Human-friendly sequence per guild (Case #1, #2, ...). */
    caseNumber: integer("case_number").notNull(),
    type: modCaseType("type").notNull(),
    /** Null for actions without one target, such as a purge of every author. */
    targetId: varchar("target_id", { length: SNOWFLAKE_LENGTH }),
    moderatorId: varchar("moderator_id", { length: SNOWFLAKE_LENGTH }).notNull(),
    reason: text("reason").notNull(),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("mod_cases_guild_case_number_unique").on(table.guildId, table.caseNumber),
    index("mod_cases_guild_target_idx").on(table.guildId, table.targetId, table.createdAt),
  ],
);

export type ModCaseRow = typeof modCases.$inferSelect;
export type ModCaseType = (typeof MOD_CASE_TYPES)[number];
