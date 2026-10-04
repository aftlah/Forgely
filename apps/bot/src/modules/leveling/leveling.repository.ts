import { and, asc, count, desc, eq, gt, sql } from "drizzle-orm";

import { memberLevels, type Database } from "@forgely/db";

export interface AwardXpInput {
  guildId: string;
  userId: string;
  gain: number;
  cooldownSeconds: number;
}

export interface MemberStanding {
  userId: string;
  xp: number;
  level: number;
}

export interface LevelingRepository {
  /**
   * Adds XP unless the member earned some less than `cooldownSeconds` ago. The check and the update
   * are one statement, so two messages arriving together cannot both be rewarded.
   * Returns the member's new total, or null when the cooldown blocked it.
   */
  awardXp: (input: AwardXpInput) => Promise<{ newXp: number } | null>;
  setLevel: (guildId: string, userId: string, level: number) => Promise<void>;
  findStanding: (guildId: string, userId: string) => Promise<MemberStanding | undefined>;
  /** 1 for the member with the most XP. Members with equal XP share a rank. */
  findRank: (guildId: string, xp: number) => Promise<number>;
  listTop: (guildId: string, limit: number, offset: number) => Promise<MemberStanding[]>;
  countMembers: (guildId: string) => Promise<number>;
}

const standingColumns = {
  userId: memberLevels.userId,
  xp: memberLevels.xp,
  level: memberLevels.level,
};

async function awardXp(
  db: Database,
  { guildId, userId, gain, cooldownSeconds }: AwardXpInput,
): Promise<{ newXp: number } | null> {
  const [row] = await db
    .insert(memberLevels)
    .values({ guildId, userId, xp: gain })
    .onConflictDoUpdate({
      target: [memberLevels.guildId, memberLevels.userId],
      // clock_timestamp() is the real current time. now() is the transaction's start time, so a
      // transaction that began a moment earlier would see a "future" last_xp_at and wrongly refuse,
      // even with a cooldown of 0.
      set: { xp: sql`${memberLevels.xp} + ${gain}`, lastXpAt: sql`clock_timestamp()` },
      // The WHERE decides whether the update happens at all: no row comes back when it does not.
      setWhere: sql`${memberLevels.lastXpAt} <= clock_timestamp() - make_interval(secs => ${cooldownSeconds})`,
    })
    .returning({ xp: memberLevels.xp });
  return row ? { newXp: row.xp } : null;
}

async function findRank(db: Database, guildId: string, xp: number): Promise<number> {
  const [row] = await db
    .select({ ahead: count() })
    .from(memberLevels)
    .where(and(eq(memberLevels.guildId, guildId), gt(memberLevels.xp, xp)));
  return (row?.ahead ?? 0) + 1;
}

async function countMembers(db: Database, guildId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(memberLevels)
    .where(eq(memberLevels.guildId, guildId));
  return row?.total ?? 0;
}

export function createLevelingRepository(db: Database): LevelingRepository {
  return {
    awardXp: (input) => awardXp(db, input),
    findRank: (guildId, xp) => findRank(db, guildId, xp),
    countMembers: (guildId) => countMembers(db, guildId),

    async setLevel(guildId, userId, level) {
      await db
        .update(memberLevels)
        .set({ level })
        .where(and(eq(memberLevels.guildId, guildId), eq(memberLevels.userId, userId)));
    },

    async findStanding(guildId, userId) {
      const [row] = await db
        .select(standingColumns)
        .from(memberLevels)
        .where(and(eq(memberLevels.guildId, guildId), eq(memberLevels.userId, userId)))
        .limit(1);
      return row;
    },

    listTop(guildId, limit, offset) {
      return db
        .select(standingColumns)
        .from(memberLevels)
        .where(eq(memberLevels.guildId, guildId))
        .orderBy(desc(memberLevels.xp), asc(memberLevels.userId))
        .limit(limit)
        .offset(offset);
    },
  };
}
