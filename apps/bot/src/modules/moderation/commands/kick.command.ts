import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "../../../core/define";
import {
  createServiceFor,
  REASON_MAX_LENGTH,
  replyWithResult,
  deferPrivately,
  resolveModerationContext,
} from "../command-context";

export const kickCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Remove a member from the server and record a case.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Who to kick").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why they are being kicked")
        .setMaxLength(REASON_MAX_LENGTH),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setContexts(InteractionContextType.Guild),

  async execute(context) {
    const { interaction, app } = context;
    // Discord drops the interaction if we have not answered within 3 seconds.
    await deferPrivately(interaction);
    const moderation = await resolveModerationContext(context, PermissionFlagsBits.KickMembers);

    const result = await createServiceFor(app).kick({
      context: moderation,
      targetId: interaction.options.getUser("user", true).id,
      reason: interaction.options.getString("reason") ?? undefined,
    });
    await replyWithResult(interaction, result);
  },
});
