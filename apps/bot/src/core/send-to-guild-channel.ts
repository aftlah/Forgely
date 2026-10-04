import type { Guild } from "discord.js";

import { NotFoundError } from "@forgely/shared";

/**
 * Posts text to a channel of the guild. Only the listed users can be pinged, so a template
 * or a username can never trigger @everyone, @here, or a role mention.
 */
export async function sendToGuildChannel(
  guild: Guild,
  channelId: string,
  content: string,
  mentionableUserIds: string[] = [],
): Promise<void> {
  const channel = await guild.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    throw new NotFoundError(`Channel ${channelId} is missing or cannot receive messages`);
  }
  await channel.send({ content, allowedMentions: { users: mentionableUserIds } });
}
