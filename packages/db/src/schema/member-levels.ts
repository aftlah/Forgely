import { index, integer, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";

import { guilds, SNOWFLAKE_LENGTH } from "./guilds";

/** One row per member per server: total XP and the level it works out to. */
export const memberLevels = pgTable(
  "member_levels",
  {
    guildId: varchar("guild_id", { length: SNOWFLAKE_LENGTH })
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: SNOWFLAKE_LENGTH }).notNull(),
    xp: integer("xp").notNull().default(0),
    /** Derived from `xp`; stored so a leaderboard can show it without recomputing. */
    level: integer("level").notNull().default(0),
    /** When XP was last awarded. Drives the per-member cooldown. */
    lastXpAt: timestamp("last_xp_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.guildId, table.userId] }),
    index("member_levels_guild_xp_idx").on(table.guildId, table.xp),
  ],
);

export type MemberLevelRow = typeof memberLevels.$inferSelect;
