import { and, inArray, isNull } from "drizzle-orm";

import type { Database } from "../client";
import { guilds } from "../schema";

export interface GuildDirectory {
  /** Of the given guild IDs, the ones the bot is currently in. */
  findActiveGuildIds: (candidateIds: string[]) => Promise<Set<string>>;
}

/** Read-only lookups the dashboard uses to decide which servers have the bot. */
export function createGuildDirectory(db: Database): GuildDirectory {
  return {
    async findActiveGuildIds(candidateIds) {
      if (candidateIds.length === 0) return new Set();

      const rows = await db
        .select({ id: guilds.id })
        .from(guilds)
        .where(and(inArray(guilds.id, candidateIds), isNull(guilds.leftAt)));
      return new Set(rows.map((row) => row.id));
    },
  };
}
