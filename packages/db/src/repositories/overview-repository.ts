import { and, count, desc, eq, gte } from "drizzle-orm";

import type { Database } from "../client";
import {
  memberLevels,
  modCases,
  tickets,
  type MemberLevelRow,
  type ModCaseRow,
  type TicketRow,
} from "../schema";

/** Read-only numbers and lists for a server's Overview page. Everything is scoped to one guild. */
export interface OverviewRepository {
  countOpenTickets: (guildId: string) => Promise<number>;
  /** Oldest first, so the ticket that has waited longest is at the top. */
  listOpenTickets: (guildId: string, limit: number) => Promise<TicketRow[]>;
  listTopMembers: (guildId: string, limit: number) => Promise<MemberLevelRow[]>;
  listRecentModCases: (guildId: string, limit: number) => Promise<ModCaseRow[]>;
  countModCasesSince: (guildId: string, since: Date) => Promise<number>;
}

export function createOverviewRepository(db: Database): OverviewRepository {
  const openTickets = (guildId: string) =>
    and(eq(tickets.guildId, guildId), eq(tickets.status, "open"));

  return {
    async countOpenTickets(guildId) {
      const [row] = await db.select({ total: count() }).from(tickets).where(openTickets(guildId));
      return row?.total ?? 0;
    },

    listOpenTickets: (guildId, limit) =>
      db.select().from(tickets).where(openTickets(guildId)).orderBy(tickets.createdAt).limit(limit),

    listTopMembers: (guildId, limit) =>
      db
        .select()
        .from(memberLevels)
        .where(eq(memberLevels.guildId, guildId))
        .orderBy(desc(memberLevels.xp), memberLevels.userId)
        .limit(limit),

    listRecentModCases: (guildId, limit) =>
      db
        .select()
        .from(modCases)
        .where(eq(modCases.guildId, guildId))
        .orderBy(desc(modCases.createdAt))
        .limit(limit),

    async countModCasesSince(guildId, since) {
      const [row] = await db
        .select({ total: count() })
        .from(modCases)
        .where(and(eq(modCases.guildId, guildId), gte(modCases.createdAt, since)));
      return row?.total ?? 0;
    },
  };
}
