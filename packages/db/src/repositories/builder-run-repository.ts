import { and, count, desc, eq, gte, min } from "drizzle-orm";

import type { Database } from "../client";
import { auditLog, builderRuns, type BuilderRunRow } from "../schema";

export interface NewBuilderRun {
  guildId: string;
  actorId: string;
  prompt: string;
  plan: unknown;
  model: string;
}

export interface FinishedBuilderRun {
  guildId: string;
  runId: string;
  actorId: string;
  status: "applied" | "failed";
  result: unknown;
}

export interface BuilderRunRepository {
  create: (input: NewBuilderRun) => Promise<BuilderRunRow>;
  /** How many plans the server asked for since `since`. Drives the daily limit. */
  countCreatedSince: (guildId: string, since: Date) => Promise<number>;
  /** When the oldest plan since `since` was made, or null when there is none. Tells when a limit frees up. */
  oldestCreatedSince: (guildId: string, since: Date) => Promise<Date | null>;
  /** Scoped to the guild, so one server can never read or apply another's run by guessing an ID. */
  findForGuild: (guildId: string, runId: string) => Promise<BuilderRunRow | null>;
  /**
   * Moves a run from `planned` to `applying` in one atomic statement. Returns false if it was not
   * `planned` (already applied, or another click got there first), so a plan is never applied twice.
   */
  claimForApply: (guildId: string, runId: string) => Promise<boolean>;
  /** Stores the outcome and an audit row together: either both happen or neither does. */
  finishWithAudit: (input: FinishedBuilderRun) => Promise<void>;
  listRecent: (guildId: string, limit: number) => Promise<BuilderRunRow[]>;
}

async function insertRun(db: Database, input: NewBuilderRun): Promise<BuilderRunRow> {
  const [row] = await db.insert(builderRuns).values(input).returning();
  if (!row) throw new Error("Inserting a builder run returned no row");
  return row;
}

async function countSince(db: Database, guildId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(builderRuns)
    .where(and(eq(builderRuns.guildId, guildId), gte(builderRuns.createdAt, since)));
  return row?.total ?? 0;
}

async function oldestSince(db: Database, guildId: string, since: Date): Promise<Date | null> {
  const [row] = await db
    .select({ oldest: min(builderRuns.createdAt) })
    .from(builderRuns)
    .where(and(eq(builderRuns.guildId, guildId), gte(builderRuns.createdAt, since)));
  return row?.oldest ?? null;
}

async function findRun(
  db: Database,
  guildId: string,
  runId: string,
): Promise<BuilderRunRow | null> {
  const [row] = await db
    .select()
    .from(builderRuns)
    .where(and(eq(builderRuns.guildId, guildId), eq(builderRuns.id, runId)))
    .limit(1);
  return row ?? null;
}

async function claimRun(db: Database, guildId: string, runId: string): Promise<boolean> {
  const claimed = await db
    .update(builderRuns)
    .set({ status: "applying" })
    .where(
      and(
        eq(builderRuns.guildId, guildId),
        eq(builderRuns.id, runId),
        eq(builderRuns.status, "planned"),
      ),
    )
    .returning({ id: builderRuns.id });
  return claimed.length === 1;
}

async function finishRun(db: Database, input: FinishedBuilderRun): Promise<void> {
  const { guildId, runId, actorId, status, result } = input;
  await db.transaction(async (transaction) => {
    await transaction
      .update(builderRuns)
      .set({ status, result, appliedAt: new Date() })
      .where(and(eq(builderRuns.guildId, guildId), eq(builderRuns.id, runId)));
    await transaction.insert(auditLog).values({
      guildId,
      actorId,
      action: `builder.${status}`,
      before: null,
      after: { runId, result },
    });
  });
}

export function createBuilderRunRepository(db: Database): BuilderRunRepository {
  return {
    create: (input) => insertRun(db, input),
    countCreatedSince: (guildId, since) => countSince(db, guildId, since),
    oldestCreatedSince: (guildId, since) => oldestSince(db, guildId, since),
    findForGuild: (guildId, runId) => findRun(db, guildId, runId),
    claimForApply: (guildId, runId) => claimRun(db, guildId, runId),
    finishWithAudit: (input) => finishRun(db, input),
    listRecent: (guildId, limit) =>
      db
        .select()
        .from(builderRuns)
        .where(eq(builderRuns.guildId, guildId))
        .orderBy(desc(builderRuns.createdAt))
        .limit(limit),
  };
}
