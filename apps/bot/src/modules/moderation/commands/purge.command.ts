import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "../../../core/define";
import {
  createServiceFor,
  replyPrivately,
  deferPrivately,
  resolveModerationContext,
} from "../command-context";
import { MAX_PURGE_AMOUNT } from "../moderation.service";

const NOTHING_DELETED_MESSAGE =
  "No messages were deleted. Discord can't bulk-delete messages older than 14 days.";

export const purgeCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete recent messages in this channel.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("How many messages to delete")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_PURGE_AMOUNT),
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("Only delete messages from this user"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setContexts(InteractionContextType.Guild),

  async execute(context) {
    const { interaction, app } = context;
    // Discord drops the interaction if we have not answered within 3 seconds.
    await deferPrivately(interaction);
    const moderation = await resolveModerationContext(context, PermissionFlagsBits.ManageMessages);

    const result = await createServiceFor(app).purge({
      context: moderation,
      channelId: interaction.channelId,
      amount: interaction.options.getInteger("amount", true),
      onlyFromUserId: interaction.options.getUser("user")?.id,
    });

    const message = result.moderationCase
      ? `Deleted ${result.deletedCount} message(s). Case #${result.moderationCase.caseNumber}.`
      : NOTHING_DELETED_MESSAGE;
    await replyPrivately(interaction, message);
  },
});
