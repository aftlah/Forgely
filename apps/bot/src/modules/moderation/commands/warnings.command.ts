import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "../../../core/define";
import { formatWarningList } from "../case-format";
import {
  createServiceFor,
  replyPrivately,
  deferPrivately,
  resolveModerationContext,
} from "../command-context";

export const warningsCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Show a member's warning history.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Whose warnings to show").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(InteractionContextType.Guild),

  async execute(context) {
    const { interaction, app } = context;
    // Discord drops the interaction if we have not answered within 3 seconds.
    await deferPrivately(interaction);
    const moderation = await resolveModerationContext(context, PermissionFlagsBits.ModerateMembers);
    const targetId = interaction.options.getUser("user", true).id;

    const warnings = await createServiceFor(app).listWarnings(moderation.guildId, targetId);
    await replyPrivately(interaction, formatWarningList(targetId, warnings));
  },
});
