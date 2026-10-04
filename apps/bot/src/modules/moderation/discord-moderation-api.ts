import { DiscordAPIError, RESTJSONErrorCodes, type Guild, type GuildMember } from "discord.js";

import { DiscordApiError, NotFoundError } from "@forgely/shared";

import { sendToGuildChannel } from "../../core/send-to-guild-channel";

import type { ModerationApi, ModerationParty } from "./moderation.types";

/** Discord returns at most this many messages per request. */
const PURGE_FETCH_LIMIT = 100;

export function toModerationParty(guild: Guild, member: GuildMember): ModerationParty {
  return {
    id: member.id,
    isOwner: guild.ownerId === member.id,
    highestRolePosition: member.roles.highest.position,
  };
}

/** Converts any discord.js failure into our typed error, keeping the original as `cause`. */
async function callDiscord<T>(description: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new DiscordApiError(`${description} failed`, error);
  }
}

async function fetchMemberOrNull(guild: Guild, userId: string): Promise<GuildMember | null> {
  try {
    return await guild.members.fetch(userId);
  } catch (error) {
    const isUnknownMember =
      error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMember;
    if (isUnknownMember) return null;
    throw new DiscordApiError("Fetching the member failed", error);
  }
}

async function fetchBulkDeletableChannel(guild: Guild, channelId: string) {
  const channel = await callDiscord("Fetching the channel", () => guild.channels.fetch(channelId));
  if (!channel?.isTextBased() || channel.isDMBased()) {
    throw new NotFoundError(`Channel ${channelId} cannot be purged`, "I can't purge that channel.");
  }
  return channel;
}

export function createDiscordModerationApi(guild: Guild): ModerationApi {
  return {
    guildName: guild.name,

    async getMember(userId) {
      const member = await fetchMemberOrNull(guild, userId);
      return member && toModerationParty(guild, member);
    },

    async ban(userId, reason, deleteMessageSeconds) {
      await callDiscord("Ban", () => guild.members.ban(userId, { reason, deleteMessageSeconds }));
    },

    async kick(userId, reason) {
      await callDiscord("Kick", () => guild.members.kick(userId, reason));
    },

    async timeout(userId, durationMs, reason) {
      const member = await callDiscord("Fetching the member", () => guild.members.fetch(userId));
      await callDiscord("Timeout", () => member.timeout(durationMs, reason));
    },

    async sendDm(userId, content) {
      try {
        const user = await guild.client.users.fetch(userId);
        await user.send(content);
        return true;
      } catch {
        // Closed DMs are normal, not an error. The caller reports it as "failed".
        return false;
      }
    },

    postToChannel: (channelId, content) => sendToGuildChannel(guild, channelId, content),

    purge: (channelId, amount, onlyFromUserId) =>
      purgeMessages(guild, channelId, amount, onlyFromUserId),
  };
}

/** Bulk-deletes the latest messages, optionally only those written by one user. */
async function purgeMessages(
  guild: Guild,
  channelId: string,
  amount: number,
  onlyFromUserId?: string,
): Promise<number> {
  const channel = await fetchBulkDeletableChannel(guild, channelId);
  if (!onlyFromUserId) {
    const deleted = await callDiscord("Purge", () => channel.bulkDelete(amount, true));
    return deleted.size;
  }

  const recent = await callDiscord("Fetching messages", () =>
    channel.messages.fetch({ limit: PURGE_FETCH_LIMIT }),
  );
  const fromUser = recent.filter((message) => message.author.id === onlyFromUserId);
  const deleted = await callDiscord("Purge", () =>
    channel.bulkDelete(fromUser.first(amount), true),
  );
  return deleted.size;
}
