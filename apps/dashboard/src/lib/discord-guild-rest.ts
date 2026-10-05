import { z } from "zod";

import { snowflakeSchema } from "@forgely/shared";

import { createTransport, DiscordRestError, toRestError } from "./discord-transport";
import type { TransportOptions } from "./discord-transport";
import { getSettingsEnv } from "./env";

const channelSchema = z.object({
  id: snowflakeSchema,
  name: z.string(),
  type: z.number(),
  parent_id: snowflakeSchema.nullish(),
  /** The channel's own permission overwrites. Absent means the server did not say, not that there are none. */
  permission_overwrites: z
    .array(z.object({ id: snowflakeSchema, type: z.number(), allow: z.string(), deny: z.string() }))
    .optional(),
});

const roleSchema = z.object({
  id: snowflakeSchema,
  name: z.string(),
  /** True for roles an integration or bot owns. They cannot be given or taken by hand. */
  managed: z.boolean().optional(),
});

/** The channels Discord itself points at for a Community server. Removing them breaks the server's setup. */
const guildSchema = z.object({
  rules_channel_id: snowflakeSchema.nullish(),
  public_updates_channel_id: snowflakeSchema.nullish(),
  system_channel_id: snowflakeSchema.nullish(),
  afk_channel_id: snowflakeSchema.nullish(),
  safety_alerts_channel_id: snowflakeSchema.nullish(),
});

const createdSchema = z.object({ id: snowflakeSchema });

export type GuildChannel = z.infer<typeof channelSchema>;
export type GuildRole = z.infer<typeof roleSchema>;

/** Who may or may not do something in one channel. `type` 0 is a role, 1 is a member. */
export interface PermissionOverwrite {
  id: string;
  type: 0 | 1;
  /** Permission bitfields as decimal strings, the way Discord wants them. */
  allow: string;
  deny: string;
}

export interface NewRole {
  name: string;
  /** RGB as a number, or 0 for Discord's default. */
  color: number;
  hoist: boolean;
}

export interface NewChannel {
  name: string;
  type: number;
  parent_id?: string;
  topic?: string;
  permission_overwrites?: PermissionOverwrite[];
}

/** Server structure calls for the AI Builder: read what exists, create what is missing, and delete what was confirmed. */
export interface DiscordGuildRest {
  listChannels: (guildId: string) => Promise<GuildChannel[]>;
  listRoles: (guildId: string) => Promise<GuildRole[]>;
  createRole: (guildId: string, role: NewRole) => Promise<{ id: string }>;
  createChannel: (guildId: string, channel: NewChannel) => Promise<{ id: string }>;
  /** IDs of the channels Discord depends on (rules, updates, system messages, AFK, safety alerts). */
  listSpecialChannelIds: (guildId: string) => Promise<string[]>;
  deleteChannel: (channelId: string) => Promise<void>;
  deleteRole: (guildId: string, roleId: string) => Promise<void>;
  /** Sets ONE overwrite (a role's or a member's) on a channel. Other overwrites are left alone. */
  putOverwrite: (channelId: string, overwrite: PermissionOverwrite) => Promise<void>;
  deleteOverwrite: (channelId: string, overwriteId: string) => Promise<void>;
}

async function readJson<T>(response: Response, schema: z.ZodType<T>, what: string): Promise<T> {
  if (!response.ok) throw await toRestError(response, what);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new DiscordRestError(response.status, undefined, `${what}: unexpected response shape`);
  }
  return parsed.data;
}

/** A delete answers 204 with no body, so there is nothing to parse: only the status matters. */
async function expectOk(response: Response, what: string): Promise<void> {
  if (!response.ok) throw await toRestError(response, what);
}

type RemovalMethods = Pick<
  DiscordGuildRest,
  "deleteChannel" | "putOverwrite" | "deleteOverwrite" | "deleteRole"
>;

/** The calls that delete or edit something that already exists, kept apart so each factory stays short. */
function createRemovalMethods(transport: ReturnType<typeof createTransport>): RemovalMethods {
  return {
    async deleteChannel(channelId) {
      await expectOk(
        await transport.request("DELETE", `/channels/${channelId}`),
        "Deleting a channel",
      );
    },
    async putOverwrite(channelId, overwrite) {
      const path = `/channels/${channelId}/permissions/${overwrite.id}`;
      const { allow, deny, type } = overwrite;
      await expectOk(
        await transport.request("PUT", path, { allow, deny, type }),
        "Changing a channel's permissions",
      );
    },
    async deleteOverwrite(channelId, overwriteId) {
      const path = `/channels/${channelId}/permissions/${overwriteId}`;
      await expectOk(await transport.request("DELETE", path), "Removing a channel permission");
    },
    async deleteRole(guildId, roleId) {
      const path = `/guilds/${guildId}/roles/${roleId}`;
      await expectOk(await transport.request("DELETE", path), "Deleting a role");
    },
  };
}

export function createDiscordGuildRest(options: TransportOptions): DiscordGuildRest {
  const transport = createTransport(options);

  return {
    async listChannels(guildId) {
      const response = await transport.request("GET", `/guilds/${guildId}/channels`);
      return readJson(response, z.array(channelSchema), "Listing channels");
    },
    async listRoles(guildId) {
      const response = await transport.request("GET", `/guilds/${guildId}/roles`);
      return readJson(response, z.array(roleSchema), "Listing roles");
    },
    async createRole(guildId, role) {
      const response = await transport.request("POST", `/guilds/${guildId}/roles`, role);
      return readJson(response, createdSchema, "Creating a role");
    },
    async createChannel(guildId, channel) {
      const response = await transport.request("POST", `/guilds/${guildId}/channels`, channel);
      return readJson(response, createdSchema, "Creating a channel");
    },
    async listSpecialChannelIds(guildId) {
      const response = await transport.request("GET", `/guilds/${guildId}`);
      const guild = await readJson(response, guildSchema, "Reading the server");
      return Object.values(guild).filter((id): id is string => typeof id === "string");
    },
    ...createRemovalMethods(transport),
  };
}

export function getDiscordGuildRest(): DiscordGuildRest {
  const env = getSettingsEnv();
  return createDiscordGuildRest({
    botToken: env.DISCORD_BOT_TOKEN,
    apiBaseUrl: env.DISCORD_API_BASE_URL,
  });
}
