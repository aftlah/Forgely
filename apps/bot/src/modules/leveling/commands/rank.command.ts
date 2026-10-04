import { InteractionContextType, SlashCommandBuilder } from "discord.js";

import { ValidationError } from "@forgely/shared";

import { defineCommand } from "../../../core/define";
import { createLevelingRepository } from "../leveling.repository";
import { formatRankCard } from "../rank-format";

export const rankCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your level and rank, or another member's.")
    .addUserOption((option) => option.setName("user").setDescription("Whose rank to show"))
    .setContexts(InteractionContextType.Guild),

  async execute({ interaction, app }) {
    const { guildId } = interaction;
    if (!guildId) throw new ValidationError("/rank used outside a guild", "Use this in a server.");
    await interaction.deferReply();

    const user = interaction.options.getUser("user") ?? interaction.user;
    const repository = createLevelingRepository(app.db);
    const standing = await repository.findStanding(guildId, user.id);

    if (!standing) {
      // A display name can be "@everyone", so nothing in this reply may ping.
      await interaction.editReply({
        content: `**${user.displayName}** hasn't earned any XP yet.`,
        allowedMentions: { parse: [] },
      });
      return;
    }
    const rank = await repository.findRank(guildId, standing.xp);
    await interaction.editReply({
      content: formatRankCard({ displayName: user.displayName, xp: standing.xp, rank }),
      allowedMentions: { parse: [] },
    });
  },
});
