import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "../../../core/define";
import {
  createServiceFor,
  REASON_MAX_LENGTH,
  replyWithResult,
  deferPrivately,
  resolveModerationContext,
} from "../command-context";

const MAX_DELETE_DAYS = 7;

export const banCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member (or a user ID) and record a case.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Who to ban").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why they are being banned")
        .setMaxLength(REASON_MAX_LENGTH),
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_days")
        .setDescription("Also delete their messages from the last N days")
        .setMinValue(0)
        .setMaxValue(MAX_DELETE_DAYS),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setContexts(InteractionContextType.Guild),

  async execute(context) {
    const { interaction, app } = context;
    // Discord drops the interaction if we have not answered within 3 seconds.
    await deferPrivately(interaction);
    const moderation = await resolveModerationContext(context, PermissionFlagsBits.BanMembers);

    const result = await createServiceFor(app).ban({
      context: moderation,
      targetId: interaction.options.getUser("user", true).id,
      reason: interaction.options.getString("reason") ?? undefined,
      deleteMessageDays: interaction.options.getInteger("delete_days") ?? 0,
    });
    await replyWithResult(interaction, result);
  },
});
