import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { guilds, SNOWFLAKE_LENGTH } from "./guilds";

export const TICKET_STATUSES = ["open", "closed"] as const;

export const ticketStatus = pgEnum("ticket_status", TICKET_STATUSES);

/** One row per ticket. The ticket is also a private Discord channel, identified by `channelId`. */
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: varchar("guild_id", { length: SNOWFLAKE_LENGTH })
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    /** Human-friendly sequence per guild (ticket-0001, ...). */
    ticketNumber: integer("ticket_number").notNull(),
    channelId: varchar("channel_id", { length: SNOWFLAKE_LENGTH }).notNull(),
    openerId: varchar("opener_id", { length: SNOWFLAKE_LENGTH }).notNull(),
    status: ticketStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedById: varchar("closed_by_id", { length: SNOWFLAKE_LENGTH }),
  },
  (table) => [
    unique("tickets_guild_ticket_number_unique").on(table.guildId, table.ticketNumber),
    unique("tickets_channel_id_unique").on(table.channelId),
    index("tickets_guild_opener_status_idx").on(table.guildId, table.openerId, table.status),
  ],
);

export type TicketRow = typeof tickets.$inferSelect;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
