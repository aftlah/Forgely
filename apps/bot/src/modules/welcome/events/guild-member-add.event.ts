import { Events } from "discord.js";

import { welcomeModuleConfig } from "@forgely/shared";

import { defineEvent } from "../../../core/define";
import { getConfigIfEnabled } from "../../../core/module-state";
import { createWelcomeActions, toMemberSnapshot } from "../discord-welcome-adapter";
import { handleMemberJoin } from "../welcome.service";

export const guildMemberAddEvent = defineEvent({
  name: Events.GuildMemberAdd,
  async execute(app, member) {
    const config = await getConfigIfEnabled(app, member.guild.id, welcomeModuleConfig);
    if (!config) return;

    await handleMemberJoin({
      config,
      member: toMemberSnapshot(member),
      actions: createWelcomeActions(member),
      logger: app.logger.child({ guildId: member.guild.id, userId: member.id, module: "welcome" }),
    });
  },
});
