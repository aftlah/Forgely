import { eq } from "drizzle-orm";

import type { Database } from "../client";
import { guilds } from "../schema";

export interface GuildRepository {
  /** Registers a guild, or clears `leftAt` if the bot was re-invited. */
  markGuildJoined: (guildId: string) => Promise<void>;
  markGuildLeft: (guildId: string) => Promise<void>;
}

export function createGuildRepository(db: Database): GuildRepository {
  return {
    async markGuildJoined(guildId) {
      await db
        .insert(guilds)
        .values({ id: guildId })
        .onConflictDoUpdate({ target: guilds.id, set: { leftAt: null } });
    },

    async markGuildLeft(guildId) {
      await db.update(guilds).set({ leftAt: new Date() }).where(eq(guilds.id, guildId));
    },
  };
}
