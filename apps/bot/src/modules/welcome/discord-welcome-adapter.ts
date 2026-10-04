import type { GuildMember, PartialGuildMember } from "discord.js";

import { sendToGuildChannel } from "../../core/send-to-guild-channel";

import type { MemberSnapshot, WelcomeActions } from "./welcome.service";

const AUTO_ROLE_AUDIT_REASON = "Forgely welcome auto-role";

export function toMemberSnapshot(member: GuildMember | PartialGuildMember): MemberSnapshot {
  return {
    id: member.id,
    username: member.user.username,
    isBot: member.user.bot,
    serverName: member.guild.name,
    memberCount: member.guild.memberCount,
  };
}

export function createWelcomeActions(member: GuildMember | PartialGuildMember): WelcomeActions {
  return {
    sendToChannel: (channelId, content, mentionUserId) =>
      sendToGuildChannel(member.guild, channelId, content, mentionUserId ? [mentionUserId] : []),
    sendDirectMessage: async (content) => {
      await member.send(content);
    },
    addRoles: async (roleIds) => {
      await member.roles.add(roleIds, AUTO_ROLE_AUDIT_REASON);
    },
  };
}
