import { z } from "zod";

import { DiscordApiError, snowflakeSchema } from "@forgely/shared";

import { getServerEnv, getSettingsEnv } from "@/lib/env";
import { describeError, logWarning } from "@/lib/log";
import { createTtlCache } from "@/lib/ttl-cache";

const RESOURCE_CACHE_TTL_MS = 30_000;

const GUILD_TEXT_CHANNEL = 0;
const GUILD_CATEGORY = 4;
const GUILD_ANNOUNCEMENT_CHANNEL = 5;
/** Discord channel types that can receive a normal message: text and announcement channels. */
const POSTABLE_CHANNEL_TYPES = new Set([GUILD_TEXT_CHANNEL, GUILD_ANNOUNCEMENT_CHANNEL]);

const HEX_RADIX = 16;
const HEX_COLOR_DIGITS = 6;

const channelSchema = z.object({
  id: snowflakeSchema,
  name: z.string(),
  type: z.number(),
  position: z.number().default(0),
});

const roleSchema = z.object({
  id: snowflakeSchema,
  name: z.string(),
  position: z.number(),
  managed: z.boolean(),
  color: z.number(),
});

const botMemberSchema = z.object({ roles: z.array(snowflakeSchema) });

export interface ChannelOption {
  id: string;
  name: string;
}

export interface RoleOption {
  id: string;
  name: string;
  /** CSS color, or null for roles without one. */
  color: string | null;
  /** False for roles the bot cannot hand out. `unavailableReason` says why, so the UI can tell the user. */
  isAssignable: boolean;
  unavailableReason: "managed" | "above-bot" | null;
}

export interface GuildResources {
  channels: ChannelOption[];
  /** Categories, which hold channels. A separate list: they cannot receive messages. */
  categories: ChannelOption[];
  roles: RoleOption[];
}

type RawChannel = z.infer<typeof channelSchema>;
type RawRole = z.infer<typeof roleSchema>;

export function toChannelOptions(channels: RawChannel[]): ChannelOption[] {
  return channels
    .filter((channel) => POSTABLE_CHANNEL_TYPES.has(channel.type))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }));
}

export function toCategoryOptions(channels: RawChannel[]): ChannelOption[] {
  return channels
    .filter((channel) => channel.type === GUILD_CATEGORY)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }));
}

function toCssColor(color: number): string | null {
  return color === 0 ? null : `#${color.toString(HEX_RADIX).padStart(HEX_COLOR_DIGITS, "0")}`;
}

/**
 * Roles a user can pick as auto-roles. `@everyone` (its ID equals the guild ID) is left out. A role is
 * assignable only if it is not integration-managed and sits below the bot's highest role, which is
 * Discord's own rule for who may grant what.
 */
export function toRoleOptions(
  roles: RawRole[],
  guildId: string,
  botRoleIds: string[],
): RoleOption[] {
  const botTopPosition = Math.max(
    0,
    ...roles.filter((role) => botRoleIds.includes(role.id)).map((role) => role.position),
  );

  return roles
    .filter((role) => role.id !== guildId)
    .sort((a, b) => b.position - a.position)
    .map((role) => {
      const unavailableReason = getUnavailableReason(role, botTopPosition);
      return {
        id: role.id,
        name: role.name,
        color: toCssColor(role.color),
        isAssignable: unavailableReason === null,
        unavailableReason,
      };
    });
}

function getUnavailableReason(
  role: RawRole,
  botTopPosition: number,
): RoleOption["unavailableReason"] {
  if (role.managed) return "managed";
  return role.position < botTopPosition ? null : "above-bot";
}

interface FetchOptions {
  guildId: string;
  botToken: string;
  botUserId: string;
  apiBaseUrl: string;
  /** Injected so tests need no network. */
  fetchImpl?: typeof fetch;
}

async function getJson(url: string, botToken: string, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(url, {
    headers: { authorization: `Bot ${botToken}` },
    cache: "no-store",
  });
  if (!response.ok)
    throw new DiscordApiError(`Discord answered ${response.status} for ${new URL(url).pathname}`);
  return response.json();
}

function parseOrThrow<T>(schema: z.ZodType<T>, payload: unknown, what: string): T {
  const result = schema.safeParse(payload);
  if (!result.success)
    throw new DiscordApiError(`Discord returned ${what} in an unexpected shape`, result.error);
  return result.data;
}

export async function fetchGuildResources({
  guildId,
  botToken,
  botUserId,
  apiBaseUrl,
  fetchImpl = fetch,
}: FetchOptions): Promise<GuildResources> {
  const base = `${apiBaseUrl}/guilds/${guildId}`;
  const [channelsJson, rolesJson, botMemberJson] = await Promise.all([
    getJson(`${base}/channels`, botToken, fetchImpl),
    getJson(`${base}/roles`, botToken, fetchImpl),
    getJson(`${base}/members/${botUserId}`, botToken, fetchImpl),
  ]);

  const channels = parseOrThrow(z.array(channelSchema), channelsJson, "the channel list");
  const roles = parseOrThrow(z.array(roleSchema), rolesJson, "the role list");
  const botMember = parseOrThrow(botMemberSchema, botMemberJson, "the bot's member record");

  return {
    channels: toChannelOptions(channels),
    categories: toCategoryOptions(channels),
    roles: toRoleOptions(roles, guildId, botMember.roles),
  };
}

const cache = createTtlCache<GuildResources>(RESOURCE_CACHE_TTL_MS);

/**
 * A server's channels and roles, cached for 30 seconds. Returns null when Discord cannot be reached
 * or the bot lacks access, so pages can degrade instead of crashing.
 */
export async function loadGuildResources(guildId: string): Promise<GuildResources | null> {
  const cached = cache.get(guildId);
  if (cached) return cached;

  try {
    const settings = getSettingsEnv();
    const resources = await fetchGuildResources({
      guildId,
      botToken: settings.DISCORD_BOT_TOKEN,
      botUserId: getServerEnv().AUTH_DISCORD_ID,
      apiBaseUrl: settings.DISCORD_API_BASE_URL,
    });
    cache.set(guildId, resources);
    return resources;
  } catch (error) {
    logWarning("Could not load guild resources", { guildId, error: describeError(error) });
    return null;
  }
}
