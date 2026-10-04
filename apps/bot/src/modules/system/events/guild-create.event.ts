import { Events } from "discord.js";

import { defineEvent } from "../../../core/define";

export const guildCreateEvent = defineEvent({
  name: Events.GuildCreate,
  async execute(app, guild) {
    await app.guildRepository.markGuildJoined(guild.id);
    app.logger.info({ guildId: guild.id, module: "system" }, "Joined guild");
  },
});
