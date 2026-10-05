import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { guilds, SNOWFLAKE_LENGTH } from "./guilds";

/**
 * `planned`: the AI produced a plan, nothing was changed yet. `applying`: someone pressed Apply (this
 * state is also the lock that stops a double click from applying twice). `applied`/`failed`: finished.
 */
export const BUILDER_RUN_STATUSES = ["planned", "applying", "applied", "failed"] as const;

export const builderRunStatus = pgEnum("builder_run_status", BUILDER_RUN_STATUSES);

/** One AI Builder session: the request, the plan the AI made, and what applying it did. */
export const builderRuns = pgTable(
  "builder_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: varchar("guild_id", { length: SNOWFLAKE_LENGTH })
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id", { length: SNOWFLAKE_LENGTH }).notNull(),
    prompt: text("prompt").notNull(),
    /** The validated plan, exactly as shown to the user. */
    plan: jsonb("plan").notNull(),
    /** Which model made it, for debugging quality. */
    model: text("model").notNull(),
    status: builderRunStatus("status").notNull().default("planned"),
    /** What happened per item once applied. Null until then. */
    result: jsonb("result"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
  },
  (table) => [index("builder_runs_guild_created_idx").on(table.guildId, table.createdAt)],
);

export type BuilderRunRow = typeof builderRuns.$inferSelect;
