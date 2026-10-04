import type { Message } from "discord.js";

import { sendToGuildChannel } from "../../core/send-to-guild-channel";

import type { LevelingPort } from "./leveling.service";

const ROLE_REWARD_AUDIT_REASON = "Forgely level reward";

/** Connects the leveling service to the message that triggered it. Only the member can be pinged. */
export function createLevelingPort(message: Message<true>): LevelingPort {
  const { author, guild, member } = message;

  return {
    announceLevelUp: async (content, channelId) => {
      if (channelId) {
        await sendToGuildChannel(guild, channelId, content, [author.id]);
        return;
      }
      await message.channel.send({ content, allowedMentions: { users: [author.id] } });
    },
    grantRoles: async (roleIds) => {
      await member?.roles.add(roleIds, ROLE_REWARD_AUDIT_REASON);
    },
  };
}
