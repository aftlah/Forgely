import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/** Discord snowflake IDs are up to 20 digits; we store them as strings, never numbers. */
export const SNOWFLAKE_LENGTH = 20;

export const guilds = pgTable("guilds", {
  id: varchar("id", { length: SNOWFLAKE_LENGTH }).primaryKey(),
  /** Reserved so a paid tier can be added later without a data migration. */
  plan: text("plan").notNull().default("free"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  /** Set when the bot is removed; kept so settings survive a re-invite. */
  leftAt: timestamp("left_at", { withTimezone: true }),
});

export type GuildRow = typeof guilds.$inferSelect;
