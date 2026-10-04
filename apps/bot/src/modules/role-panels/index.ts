import { rolePanelsModuleConfig } from "@forgely/shared";

import { defineModule } from "../../core/define";

import { rolePanelButton } from "./buttons/role-panel.button";

/**
 * Role panels: messages with buttons that give or take roles. The panels are designed and posted from
 * the dashboard; this module only handles the clicks. It needs no commands, events, or special intents.
 */
export const rolePanelsModule = defineModule({
  id: rolePanelsModuleConfig.moduleId,
  commands: [],
  events: [],
  buttons: [rolePanelButton],
  config: rolePanelsModuleConfig,
});
