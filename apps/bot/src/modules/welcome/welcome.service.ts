import { renderTemplate, type TemplateVariables, type WelcomeConfig } from "@forgely/shared";

import type { Logger } from "../../core/logger";

/** The facts about a member that welcome messages need, independent of discord.js. */
export interface MemberSnapshot {
  id: string;
  username: string;
  isBot: boolean;
  serverName: string;
  memberCount: number;
}

/** What the service can do in Discord. The adapter implements it; tests fake it. */
export interface WelcomeActions {
  sendToChannel: (channelId: string, content: string, mentionUserId?: string) => Promise<void>;
  sendDirectMessage: (content: string) => Promise<void>;
  addRoles: (roleIds: string[]) => Promise<void>;
}

interface WelcomeParams {
  config: WelcomeConfig;
  member: MemberSnapshot;
  actions: WelcomeActions;
  logger: Logger;
}

export function buildJoinVariables(member: MemberSnapshot): TemplateVariables {
  return {
    user: `<@${member.id}>`,
    username: member.username,
    server: member.serverName,
    memberCount: String(member.memberCount),
  };
}

/** A member who left can no longer be mentioned, so `{user}` falls back to their name. */
export function buildLeaveVariables(member: MemberSnapshot): TemplateVariables {
  return { ...buildJoinVariables(member), user: member.username };
}

/** One failing step (missing permission, deleted channel, closed DMs) must not block the rest. */
async function attempt(logger: Logger, step: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    logger.warn({ err: error, step }, "Welcome step failed");
  }
}

/** Gives auto-roles first, then posts the welcome message and sends the DM. Bots only get roles. */
export async function handleMemberJoin({
  config,
  member,
  actions,
  logger,
}: WelcomeParams): Promise<void> {
  if (config.autoRoleIds.length > 0) {
    await attempt(logger, "auto-role", () => actions.addRoles(config.autoRoleIds));
  }
  if (member.isBot) return;

  const variables = buildJoinVariables(member);
  const { channelId, message } = config.welcome;
  if (channelId) {
    const content = renderTemplate(message, variables);
    await attempt(logger, "welcome-message", () =>
      actions.sendToChannel(channelId, content, member.id),
    );
  }
  if (config.dm.isEnabled) {
    const content = renderTemplate(config.dm.message, variables);
    await attempt(logger, "welcome-dm", () => actions.sendDirectMessage(content));
  }
}

export async function handleMemberLeave({
  config,
  member,
  actions,
  logger,
}: WelcomeParams): Promise<void> {
  const { channelId, message } = config.goodbye;
  if (member.isBot || !channelId) return;

  const content = renderTemplate(message, buildLeaveVariables(member));
  await attempt(logger, "goodbye-message", () => actions.sendToChannel(channelId, content));
}
