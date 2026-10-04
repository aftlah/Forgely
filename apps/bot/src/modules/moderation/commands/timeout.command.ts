import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "../../../core/define";
import {
  createServiceFor,
  REASON_MAX_LENGTH,
  replyWithResult,
  deferPrivately,
  resolveModerationContext,
} from "../command-context";
import { parseTimeoutDuration } from "../duration";

export const timeoutCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Temporarily stop a member from talking and record a case.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Who to time out").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("For example 30m, 2h, 7d, or 1h30m (up to 28d)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why they are being timed out")
        .setMaxLength(REASON_MAX_LENGTH),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild),

  async execute(context) {
    const { interaction, app } = context;
    // Discord drops the interaction if we have not answered within 3 seconds.
    await deferPrivately(interaction);
    const durationMs = parseTimeoutDuration(interaction.options.getString("duration", true));
    const moderation = await resolveModerationContext(context, PermissionFlagsBits.ModerateMembers);

    const result = await createServiceFor(app).timeout({
      context: moderation,
      targetId: interaction.options.getUser("user", true).id,
      reason: interaction.options.getString("reason") ?? undefined,
      durationMs,
    });
    await replyWithResult(interaction, result);
  },
});
