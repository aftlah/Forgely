import { InteractionContextType, SlashCommandBuilder } from "discord.js";

import { ValidationError } from "@forgely/shared";

import { defineCommand } from "../../../core/define";
import { createLevelingRepository } from "../leveling.repository";
import { formatLeaderboard } from "../rank-format";

const PAGE_SIZE = 10;
const MAX_PAGE = 1000;

export const leaderboardCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the members with the most XP.")
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Which page to show")
        .setMinValue(1)
        .setMaxValue(MAX_PAGE),
    )
    .setContexts(InteractionContextType.Guild),

  async execute({ interaction, app }) {
    const { guildId } = interaction;
    if (!guildId)
      throw new ValidationError("/leaderboard used outside a guild", "Use this in a server.");
    await interaction.deferReply();

    const repository = createLevelingRepository(app.db);
    const total = await repository.countMembers(guildId);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(interaction.options.getInteger("page") ?? 1, totalPages);

    const offset = (page - 1) * PAGE_SIZE;
    const rows = await repository.listTop(guildId, PAGE_SIZE, offset);
    // Mentions render as names but never ping anyone.
    await interaction.editReply({
      content: formatLeaderboard(rows, page, totalPages, offset + 1),
      allowedMentions: { parse: [] },
    });
  },
});
