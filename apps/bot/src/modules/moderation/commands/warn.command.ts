import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "../../../core/define";
import {
  createServiceFor,
  REASON_MAX_LENGTH,
  replyWithResult,
  deferPrivately,
  resolveModerationContext,
} from "../command-context";

export const warnCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Give a member a warning that stays on their record.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Who to warn").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("What they did")
        .setRequired(true)
        .setMaxLength(REASON_MAX_LENGTH),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild),

  async execute(context) {
    const { interaction, app } = context;
    // Discord drops the interaction if we have not answered within 3 seconds.
    await deferPrivately(interaction);
    const moderation = await resolveModerationContext(context, PermissionFlagsBits.ModerateMembers);

    const result = await createServiceFor(app).warn({
      context: moderation,
      targetId: interaction.options.getUser("user", true).id,
      reason: interaction.options.getString("reason", true),
    });
    await replyWithResult(interaction, result);
  },
});
