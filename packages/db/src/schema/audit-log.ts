import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { SNOWFLAKE_LENGTH } from "./guilds";

/** Records who changed what from the dashboard. Append-only. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: varchar("guild_id", { length: SNOWFLAKE_LENGTH }).notNull(),
    actorId: varchar("actor_id", { length: SNOWFLAKE_LENGTH }).notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_log_guild_created_idx").on(table.guildId, table.createdAt)],
);
