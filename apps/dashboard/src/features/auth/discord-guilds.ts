import { z } from "zod";

import { DiscordApiError, hasManageGuildPermission, snowflakeSchema } from "@forgely/shared";

const HTTP_UNAUTHORIZED = 401;

/** One entry of Discord's `GET /users/@me/guilds`. Validated because it is external input. */
const discordGuildSchema = z.object({
  id: snowflakeSchema,
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean(),
  permissions: z.string().regex(/^\d+$/),
});

export type DiscordGuild = z.infer<typeof discordGuildSchema>;

export function parseDiscordGuilds(payload: unknown): DiscordGuild[] {
  const result = z.array(discordGuildSchema).safeParse(payload);
  if (!result.success) {
    throw new DiscordApiError("Discord returned a guild list in an unexpected shape", result.error);
  }
  return result.data;
}

/** Servers the user may configure: they own it, or have Manage Server (or Administrator). */
export function filterManageableGuilds(guilds: DiscordGuild[]): DiscordGuild[] {
  return guilds.filter((guild) => guild.owner || hasManageGuildPermission(guild.permissions));
}

export type GuildFetchResult =
  | { status: "ok"; guilds: DiscordGuild[] }
  /** Discord rejected the token: it expired or the user revoked access. */
  | { status: "unauthorized" };

interface FetchGuildsOptions {
  accessToken: string;
  apiBaseUrl: string;
  /** Injected so tests need no network. */
  fetchImpl?: typeof fetch;
}

export async function fetchDiscordGuilds({
  accessToken,
  apiBaseUrl,
  fetchImpl = fetch,
}: FetchGuildsOptions): Promise<GuildFetchResult> {
  const response = await fetchImpl(`${apiBaseUrl}/users/@me/guilds`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (response.status === HTTP_UNAUTHORIZED) return { status: "unauthorized" };
  if (!response.ok) {
    throw new DiscordApiError(
      `Discord answered ${response.status} when listing the user's servers`,
    );
  }
  return { status: "ok", guilds: parseDiscordGuilds(await response.json()) };
}

const ICON_SIZE = 64;

/** URL of a server's icon, or null when it has none (the UI then shows an initial). */
export function getGuildIconUrl(guild: Pick<DiscordGuild, "id" | "icon">): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=${ICON_SIZE}`;
}
