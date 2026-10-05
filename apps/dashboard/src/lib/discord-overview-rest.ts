import { z } from "zod";

import { createTransport } from "./discord-transport";
import { getSettingsEnv } from "./env";
import { createTtlCache } from "./ttl-cache";

const CACHE_TTL_MS = 60_000;

const guildSchema = z.object({ approximate_member_count: z.number().int().nonnegative() });
const memberSchema = z.object({
  nick: z.string().nullish(),
  user: z.object({ username: z.string(), global_name: z.string().nullish() }),
});

export interface OverviewRest {
  /** How many members the server has, or null when Discord could not say. */
  getMemberCount: (guildId: string) => Promise<number | null>;
  /** A display name for each user ID. A user who left (or was not found) is simply missing from the map. */
  getMemberNames: (guildId: string, userIds: string[]) => Promise<Map<string, string>>;
}

interface Options {
  botToken: string;
  apiBaseUrl: string;
  /** Injected so tests need no network. */
  fetchImpl?: typeof fetch;
}

/** Read-only Discord calls for the Overview page. A failed call degrades to "unknown", never to an error page. */
export function createOverviewRest(options: Options): OverviewRest {
  const transport = createTransport(options);

  async function getJson(path: string): Promise<unknown> {
    const response = await transport.request("GET", path);
    return response.ok ? response.json() : null;
  }

  async function getMemberName(guildId: string, userId: string): Promise<string | null> {
    try {
      const parsed = memberSchema.safeParse(await getJson(`/guilds/${guildId}/members/${userId}`));
      if (!parsed.success) return null;
      return parsed.data.nick ?? parsed.data.user.global_name ?? parsed.data.user.username;
    } catch {
      return null;
    }
  }

  return {
    async getMemberCount(guildId) {
      try {
        const parsed = guildSchema.safeParse(await getJson(`/guilds/${guildId}?with_counts=true`));
        return parsed.success ? parsed.data.approximate_member_count : null;
      } catch {
        return null;
      }
    },

    async getMemberNames(guildId, userIds) {
      const unique = [...new Set(userIds)];
      const names = await Promise.all(unique.map((id) => getMemberName(guildId, id)));
      const result = new Map<string, string>();
      unique.forEach((id, index) => {
        const name = names[index];
        if (name) result.set(id, name);
      });
      return result;
    },
  };
}

const memberCounts = createTtlCache<number | null>(CACHE_TTL_MS);

/** The real client, with the member count cached for a minute so reloading the page does not hammer Discord. */
export function getOverviewRest(): OverviewRest {
  const env = getSettingsEnv();
  const rest = createOverviewRest({
    botToken: env.DISCORD_BOT_TOKEN,
    apiBaseUrl: env.DISCORD_API_BASE_URL,
  });
  return {
    async getMemberCount(guildId) {
      const cached = memberCounts.get(guildId);
      if (cached !== undefined) return cached;
      const count = await rest.getMemberCount(guildId);
      memberCounts.set(guildId, count);
      return count;
    },
    getMemberNames: rest.getMemberNames,
  };
}
