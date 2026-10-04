import { Events } from "discord.js";

import { defineEvent } from "../../../core/define";

/**
 * Registers every guild the bot is already in. Covers guilds joined while the bot was offline,
 * when no GuildCreate event was received for them.
 */
export const syncGuildsOnReadyEvent = defineEvent({
  name: Events.ClientReady,
  once: true,
  async execute(app, client) {
    const guildIds = [...client.guilds.cache.keys()];
    await Promise.all(guildIds.map((guildId) => app.guildRepository.markGuildJoined(guildId)));
    app.logger.info({ guildCount: guildIds.length, module: "system" }, "Bot ready, guilds synced");
  },
});
