import { MessageFlags } from "discord.js";

import {
  NotFoundError,
  parseRolePanelButtonParts,
  ROLE_PANEL_BUTTON_PREFIX,
  rolePanelsModuleConfig,
} from "@forgely/shared";

import { defineButton } from "../../../core/define";
import { createRolePanelPort } from "../discord-role-panels-adapter";
import { handleRolePanelClick } from "../role-panels.service";

/**
 * A click on one role-panel button. Anyone can press it, and the ID inside came from a message that
 * could be old, so the service checks it against the saved panel. The reply is private to the clicker.
 */
export const rolePanelButton = defineButton({
  prefix: ROLE_PANEL_BUTTON_PREFIX,

  async execute({ interaction, app, logger, parts }) {
    const ids = parseRolePanelButtonParts(parts);
    if (!ids || !interaction.inCachedGuild()) {
      throw new NotFoundError("Malformed role-panel button", "This button doesn't work any more.");
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const { config } = await app.guildConfig.getModuleState(
      interaction.guildId,
      rolePanelsModuleConfig,
    );

    const content = await handleRolePanelClick({
      config,
      panelId: ids.panelId,
      roleId: ids.roleId,
      memberRoleIds: new Set(interaction.member.roles.cache.keys()),
      port: createRolePanelPort(interaction.member),
      logger,
    });
    // Role mentions render as names here and never ping anyone.
    await interaction.editReply({ content, allowedMentions: { parse: [] } });
  },
});
