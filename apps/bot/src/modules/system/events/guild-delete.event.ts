import { Events } from "discord.js";

import { defineEvent } from "../../../core/define";

export const guildDeleteEvent = defineEvent({
  name: Events.GuildDelete,
  async execute(app, guild) {
    await app.guildRepository.markGuildLeft(guild.id);
    app.logger.info({ guildId: guild.id, module: "system" }, "Left guild");
  },
});
