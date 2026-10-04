import { snowflakeSchema } from "@forgely/shared";

import { auth } from "@/auth";
import { listUserServers } from "@/features/auth/guild-access";
import { createRateLimiter } from "@/lib/rate-limiter";

const ACTIONS_PER_MINUTE = 30;
const ONE_MINUTE_MS = 60_000;
/** One budget per person across every action that changes things, so no single one can be spammed. */
const actionLimiter = createRateLimiter(ACTIONS_PER_MINUTE, ONE_MINUTE_MS);

export type DeniedReason = "signed-out" | "forbidden" | "rate-limited";

export type Authorization =
  { ok: true; actorId: string } | { ok: false; reason: DeniedReason; message: string };

const denied = (reason: DeniedReason, message: string): Authorization => ({
  ok: false,
  reason,
  message,
});

/**
 * The checks every Server Action must repeat itself, because an action can be called with a direct
 * POST that never touched the page: who is calling, how often, and whether they may manage THIS server.
 */
export async function authorizeGuildAction(guildId: string): Promise<Authorization> {
  const session = await auth();
  const actorId = session?.user?.id;
  if (!actorId) return denied("signed-out", "Your session ended. Sign in again to continue.");

  if (!actionLimiter.tryAcquire(actorId)) {
    return denied("rate-limited", "You're doing that too quickly. Wait a moment and try again.");
  }

  const servers = await listUserServers();
  const mayManage =
    snowflakeSchema.safeParse(guildId).success &&
    servers.status === "ok" &&
    servers.servers.some((server) => server.id === guildId && server.isBotPresent);
  if (!mayManage) return denied("forbidden", "You can't change settings for this server.");

  return { ok: true, actorId };
}
