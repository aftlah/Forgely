import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";

import { moderationModuleConfig, PermissionError, ValidationError } from "@forgely/shared";

import type { AppContext, CommandContext } from "../../core/types";

import { formatActionReply } from "./case-format";
import { createDiscordModerationApi, toModerationParty } from "./discord-moderation-api";
import { createModerationRepository } from "./moderation.repository";
import { createModerationService, type ModerationService } from "./moderation.service";
import type { ModerationContext, ModerationResult } from "./moderation.types";

/** Leaves room in Discord's 512-character audit-log reason for the moderator prefix. */
export const REASON_MAX_LENGTH = 400;

export function createServiceFor(app: AppContext): ModerationService {
  return createModerationService({ repository: createModerationRepository(app.db) });
}

/**
 * Gathers who is acting, who the bot is, and the guild's settings.
 * Also re-checks the moderator's permission, because server admins can loosen a command's
 * default permission in Discord's Integrations settings.
 */
export async function resolveModerationContext(
  { interaction, app, logger }: CommandContext,
  requiredPermission: bigint,
): Promise<ModerationContext> {
  const { guild } = interaction;
  if (!guild) {
    throw new ValidationError("Moderation command used outside a guild", "Use this in a server.");
  }
  if (!interaction.memberPermissions?.has(requiredPermission)) {
    throw new PermissionError(`Missing permission ${requiredPermission}`);
  }

  const [state, actorMember, botMember] = await Promise.all([
    app.guildConfig.getModuleState(guild.id, moderationModuleConfig),
    guild.members.fetch(interaction.user.id),
    guild.members.fetchMe(),
  ]);

  return {
    api: createDiscordModerationApi(guild),
    config: state.config,
    guildId: guild.id,
    actor: toModerationParty(guild, actorMember),
    bot: toModerationParty(guild, botMember),
    logger,
  };
}

/**
 * Acknowledges the command right away ("Forgely is thinking...", visible only to the moderator).
 * Moderation commands make several network calls, and Discord invalidates an interaction that
 * has no response after 3 seconds.
 */
export async function deferPrivately(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
}

/** Sends the final answer, completing the deferred reply if there is one. */
export async function replyPrivately(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  if (interaction.deferred) {
    await interaction.editReply({ content });
    return;
  }
  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

export async function replyWithResult(
  interaction: ChatInputCommandInteraction,
  { moderationCase, dmStatus }: ModerationResult,
): Promise<void> {
  await replyPrivately(interaction, formatActionReply(moderationCase, dmStatus));
}
