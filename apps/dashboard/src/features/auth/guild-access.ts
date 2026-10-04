import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createGuildDirectory } from "@forgely/db";

import { fetchDiscordGuilds, filterManageableGuilds, type DiscordGuild } from "./discord-guilds";

import { auth, readDiscordAccessToken } from "@/auth";
import { getDatabase } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { createTtlCache } from "@/lib/ttl-cache";

const GUILD_CACHE_TTL_MS = 60_000;

/** A server the signed-in user can manage, plus whether Forgely is in it. */
export interface UserServer extends DiscordGuild {
  isBotPresent: boolean;
}

export type ServerListResult =
  | { status: "signed-out" }
  /** Signed in once, but the Discord token ran out or was revoked. Sign in again. */
  | { status: "expired" }
  | { status: "ok"; servers: UserServer[] };

const guildCache = createTtlCache<DiscordGuild[]>(GUILD_CACHE_TTL_MS);

async function loadGuilds(userId: string, accessToken: string): Promise<DiscordGuild[] | null> {
  const cached = guildCache.get(userId);
  if (cached) return cached;

  const result = await fetchDiscordGuilds({
    accessToken,
    apiBaseUrl: getServerEnv().DISCORD_API_BASE_URL,
  });
  if (result.status === "unauthorized") return null;

  guildCache.set(userId, result.guilds);
  return result.guilds;
}

/** Bot servers first, then alphabetical, so the usable ones are at the top. */
function sortServers(servers: UserServer[]): UserServer[] {
  return [...servers].sort(
    (a, b) => Number(b.isBotPresent) - Number(a.isBotPresent) || a.name.localeCompare(b.name),
  );
}

/**
 * The servers the current user may configure, checked against Discord on every call (cached for a
 * minute). Permissions are never trusted from the browser.
 */
async function loadUserServers(): Promise<ServerListResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: "signed-out" };

  const accessToken = await readDiscordAccessToken();
  if (!accessToken) return { status: "expired" };

  const guilds = await loadGuilds(session.user.id, accessToken);
  if (!guilds) return { status: "expired" };

  const manageable = filterManageableGuilds(guilds);
  const present = await createGuildDirectory(getDatabase()).findActiveGuildIds(
    manageable.map((guild) => guild.id),
  );
  const servers = manageable.map((guild) => ({ ...guild, isBotPresent: present.has(guild.id) }));
  return { status: "ok", servers: sortServers(servers) };
}

/**
 * `cache` makes the layout and the page of one request share a single lookup, instead of asking
 * Discord and the database twice for the same answer.
 */
export const listUserServers = cache(loadUserServers);

/**
 * Guard for every per-server page. Signed-out users go back to the dashboard home. Anyone without
 * access gets a 404, the same as a server that does not exist, so IDs cannot be probed.
 */
export async function requireGuildAccess(guildId: string): Promise<UserServer> {
  const result = await listUserServers();
  if (result.status !== "ok") redirect("/dashboard");

  const server = result.servers.find(
    (candidate) => candidate.id === guildId && candidate.isBotPresent,
  );
  if (!server) notFound();
  return server;
}
