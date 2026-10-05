import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { builderRuns } from "./builder-runs";
import { guilds, SNOWFLAKE_LENGTH } from "./guilds";

export const BUILDER_MESSAGE_ROLES = ["user", "assistant"] as const;

export const builderMessageRole = pgEnum("builder_message_role", BUILDER_MESSAGE_ROLES);

/** One AI Builder conversation. Private to the person who started it, within one server. */
export const builderChats = pgTable(
  "builder_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: varchar("guild_id", { length: SNOWFLAKE_LENGTH })
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    ownerId: varchar("owner_id", { length: SNOWFLAKE_LENGTH }).notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Bumped on every message, so the list shows the latest conversation first. */
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("builder_chats_owner_updated_idx").on(table.guildId, table.ownerId, table.updatedAt),
  ],
);

/** A message in a chat. An assistant message that carries a plan points at its run. */
export const builderMessages = pgTable(
  "builder_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => builderChats.id, { onDelete: "cascade" }),
    role: builderMessageRole("role").notNull(),
    content: text("content").notNull(),
    /** The plan this message produced. The run (and its history entry) outlives the chat. */
    runId: uuid("run_id").references(() => builderRuns.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("builder_messages_chat_created_idx").on(table.chatId, table.createdAt)],
);

export type BuilderChatRow = typeof builderChats.$inferSelect;
export type BuilderMessageRow = typeof builderMessages.$inferSelect;
