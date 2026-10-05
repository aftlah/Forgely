import { and, asc, eq, sql } from "drizzle-orm";

import { tickets, type Database, type TicketRow } from "@forgely/db";

export interface NewTicket {
  guildId: string;
  openerId: string;
  channelId: string;
  /** How many tickets this person may have open at once. */
  maxOpen: number;
}

export interface TicketsRepository {
  listOpenForUser: (guildId: string, openerId: string) => Promise<TicketRow[]>;
  /**
   * Records a new ticket unless the person is already at the limit. The count and the insert happen
   * under one lock per server, so two clicks at the same moment cannot both slip through, and ticket
   * numbers never repeat. Returns null when the limit was reached.
   */
  createIfUnderLimit: (input: NewTicket) => Promise<TicketRow | null>;
  findOpenByChannel: (guildId: string, channelId: string) => Promise<TicketRow | undefined>;
  /**
   * Marks an open ticket closed in one atomic statement. Returns undefined when it was not open (already
   * closed, or never a ticket), so closing twice does nothing the second time.
   */
  close: (
    guildId: string,
    channelId: string,
    closedById: string | null,
  ) => Promise<TicketRow | undefined>;
}

const isOpenFor = (guildId: string, openerId: string) =>
  and(eq(tickets.guildId, guildId), eq(tickets.openerId, openerId), eq(tickets.status, "open"));

const isOpenIn = (guildId: string, channelId: string) =>
  and(eq(tickets.guildId, guildId), eq(tickets.channelId, channelId), eq(tickets.status, "open"));

function createIfUnderLimit(db: Database, input: NewTicket): Promise<TicketRow | null> {
  const { guildId, openerId, channelId, maxOpen } = input;
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${guildId}))`);

    const open = await transaction
      .select({ id: tickets.id })
      .from(tickets)
      .where(isOpenFor(guildId, openerId));
    if (open.length >= maxOpen) return null;

    const nextNumber = sql<number>`(select coalesce(max(${tickets.ticketNumber}), 0) + 1 from ${tickets} where ${tickets.guildId} = ${guildId})`;
    const [created] = await transaction
      .insert(tickets)
      .values({ guildId, openerId, channelId, ticketNumber: nextNumber })
      .returning();
    if (!created) throw new Error("Inserting a ticket returned no row");
    return created;
  });
}

export function createTicketsRepository(db: Database): TicketsRepository {
  return {
    createIfUnderLimit: (input) => createIfUnderLimit(db, input),

    listOpenForUser: (guildId, openerId) =>
      db.select().from(tickets).where(isOpenFor(guildId, openerId)).orderBy(asc(tickets.createdAt)),

    async findOpenByChannel(guildId, channelId) {
      const [row] = await db.select().from(tickets).where(isOpenIn(guildId, channelId)).limit(1);
      return row;
    },

    async close(guildId, channelId, closedById) {
      const [row] = await db
        .update(tickets)
        .set({ status: "closed", closedAt: sql`clock_timestamp()`, closedById })
        .where(isOpenIn(guildId, channelId))
        .returning();
      return row;
    },
  };
}
