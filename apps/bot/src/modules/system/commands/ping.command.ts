import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { defineCommand } from "../../../core/define";

export const pingCommand = defineCommand({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check that the bot is responding."),

  async execute({ interaction }) {
    const roundTripMs = Date.now() - interaction.createdTimestamp;
    const gatewayMs = interaction.client.ws.ping;
    await interaction.reply({
      content: `Pong. Round trip ${roundTripMs} ms, gateway ${gatewayMs} ms.`,
      flags: MessageFlags.Ephemeral,
    });
  },
});
