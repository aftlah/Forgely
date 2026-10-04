import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { guilds, SNOWFLAKE_LENGTH } from "./guilds";

export const guildModuleConfigs = pgTable(
  "guild_module_configs",
  {
    guildId: varchar("guild_id", { length: SNOWFLAKE_LENGTH })
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    moduleId: varchar("module_id", { length: 64 }).notNull(),
    isEnabled: boolean("is_enabled").notNull().default(false),
    /** Version of the module's Zod config schema this row was written with. */
    configVersion: integer("config_version").notNull(),
    config: jsonb("config").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Discord user ID of the dashboard user who last saved this row. */
    updatedBy: varchar("updated_by", { length: SNOWFLAKE_LENGTH }),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.moduleId] })],
);

export type GuildModuleConfigRow = typeof guildModuleConfigs.$inferSelect;
