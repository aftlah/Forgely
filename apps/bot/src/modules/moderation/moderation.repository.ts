import { and, desc, eq, sql } from "drizzle-orm";

import { modCases, type Database, type ModCaseType } from "@forgely/db";

import type { ModCase } from "./moderation.types";

export interface NewModCase {
  guildId: string;
  type: ModCaseType;
  targetId: string | null;
  moderatorId: string;
  reason: string;
  durationSeconds: number | null;
}

export interface ModerationRepository {
  /** Stores a case and assigns the guild's next case number. */
  createCase: (input: NewModCase) => Promise<ModCase>;
  /** Newest first. */
  listCasesForTarget: (
    guildId: string,
    targetId: string,
    type: ModCaseType,
    limit: number,
  ) => Promise<ModCase[]>;
}

export function createModerationRepository(db: Database): ModerationRepository {
  return {
    async createCase(input) {
      const nextCaseNumber = sql<number>`(select coalesce(max(${modCases.caseNumber}), 0) + 1 from ${modCases} where ${modCases.guildId} = ${input.guildId})`;

      return db.transaction(async (transaction) => {
        // Cases for one guild are queued behind this lock, so two simultaneous actions can never
        // read the same "next number". The lock is released when the transaction ends. The unique
        // index on (guild_id, case_number) stays as a safety net.
        await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${input.guildId}))`);

        const [created] = await transaction
          .insert(modCases)
          .values({ ...input, caseNumber: nextCaseNumber })
          .returning();
        if (!created) throw new Error("Inserting a moderation case returned no row");
        return created;
      });
    },

    listCasesForTarget(guildId, targetId, type, limit) {
      return db
        .select()
        .from(modCases)
        .where(
          and(
            eq(modCases.guildId, guildId),
            eq(modCases.targetId, targetId),
            eq(modCases.type, type),
          ),
        )
        .orderBy(desc(modCases.createdAt))
        .limit(limit);
    },
  };
}
