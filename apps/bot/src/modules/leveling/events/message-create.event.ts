import { Events } from "discord.js";

import { levelingModuleConfig } from "@forgely/shared";

import { defineEvent } from "../../../core/define";
import { getConfigIfEnabled } from "../../../core/module-state";
import { createLevelingPort } from "../discord-leveling-adapter";
import { createLevelingRepository } from "../leveling.repository";
import { createLevelingService } from "../leveling.service";

/**
 * Counts a message towards XP. Ignores bots, webhooks, system messages, and DMs. It never reads the
 * message text, so it works without the privileged Message Content intent.
 */
export const messageCreateEvent = defineEvent({
  name: Events.MessageCreate,
  async execute(app, message) {
    if (message.author.bot || message.webhookId || message.system || !message.inGuild()) return;

    const config = await getConfigIfEnabled(app, message.guild.id, levelingModuleConfig);
    if (!config) return;

    const service = createLevelingService({ repository: createLevelingRepository(app.db) });
    await service.handleMessage({
      guildId: message.guild.id,
      userId: message.author.id,
      username: message.author.username,
      guildName: message.guild.name,
      config,
      port: createLevelingPort(message),
      logger: app.logger.child({
        guildId: message.guild.id,
        userId: message.author.id,
        module: "leveling",
      }),
    });
  },
});
