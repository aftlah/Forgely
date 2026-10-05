import { and, asc, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../client";
import {
  builderChats,
  builderMessages,
  type BuilderChatRow,
  type BuilderMessageRow,
} from "../schema";

export interface NewBuilderMessage {
  role: "user" | "assistant";
  content: string;
  runId?: string | null;
}

export interface BuilderChatRepository {
  createChat: (guildId: string, ownerId: string, title: string) => Promise<BuilderChatRow>;
  /** Scoped to guild and owner, so a chat ID alone never opens someone else's conversation. */
  findChat: (guildId: string, ownerId: string, chatId: string) => Promise<BuilderChatRow | null>;
  listChats: (guildId: string, ownerId: string, limit: number) => Promise<BuilderChatRow[]>;
  listMessages: (chatId: string) => Promise<BuilderMessageRow[]>;
  /** Stores both sides of one exchange together and bumps the chat, or stores neither. */
  addExchange: (chatId: string, messages: NewBuilderMessage[]) => Promise<void>;
  deleteChat: (guildId: string, ownerId: string, chatId: string) => Promise<void>;
  deleteAllChats: (guildId: string, ownerId: string) => Promise<void>;
}

const ownedBy = (guildId: string, ownerId: string) =>
  and(eq(builderChats.guildId, guildId), eq(builderChats.ownerId, ownerId));

async function createChat(
  db: Database,
  guildId: string,
  ownerId: string,
  title: string,
): Promise<BuilderChatRow> {
  const [row] = await db.insert(builderChats).values({ guildId, ownerId, title }).returning();
  if (!row) throw new Error("Inserting a builder chat returned no row");
  return row;
}

async function findChat(
  db: Database,
  guildId: string,
  ownerId: string,
  chatId: string,
): Promise<BuilderChatRow | null> {
  const [row] = await db
    .select()
    .from(builderChats)
    .where(and(ownedBy(guildId, ownerId), eq(builderChats.id, chatId)))
    .limit(1);
  return row ?? null;
}

async function addExchange(
  db: Database,
  chatId: string,
  messages: NewBuilderMessage[],
): Promise<void> {
  await db.transaction(async (transaction) => {
    // One timestamp per message, a millisecond apart, so the order is always the order given.
    const base = Date.now();
    await transaction.insert(builderMessages).values(
      messages.map((message, index) => ({
        chatId,
        role: message.role,
        content: message.content,
        runId: message.runId ?? null,
        createdAt: new Date(base + index),
      })),
    );
    await transaction
      .update(builderChats)
      .set({ updatedAt: sql`clock_timestamp()` })
      .where(eq(builderChats.id, chatId));
  });
}

export function createBuilderChatRepository(db: Database): BuilderChatRepository {
  return {
    createChat: (guildId, ownerId, title) => createChat(db, guildId, ownerId, title),
    findChat: (guildId, ownerId, chatId) => findChat(db, guildId, ownerId, chatId),
    addExchange: (chatId, messages) => addExchange(db, chatId, messages),

    listChats: (guildId, ownerId, limit) =>
      db
        .select()
        .from(builderChats)
        .where(ownedBy(guildId, ownerId))
        .orderBy(desc(builderChats.updatedAt))
        .limit(limit),

    listMessages: (chatId) =>
      db
        .select()
        .from(builderMessages)
        .where(eq(builderMessages.chatId, chatId))
        .orderBy(asc(builderMessages.createdAt), asc(builderMessages.role)),

    async deleteChat(guildId, ownerId, chatId) {
      await db
        .delete(builderChats)
        .where(and(ownedBy(guildId, ownerId), eq(builderChats.id, chatId)));
    },

    async deleteAllChats(guildId, ownerId) {
      await db.delete(builderChats).where(ownedBy(guildId, ownerId));
    },
  };
}
