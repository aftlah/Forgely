import { welcomeModuleConfig } from "@forgely/shared";

import { defineModule } from "../../core/define";

import { guildMemberAddEvent } from "./events/guild-member-add.event";
import { guildMemberRemoveEvent } from "./events/guild-member-remove.event";

/** Welcome and goodbye messages, optional welcome DM, and auto-roles for new members. */
export const welcomeModule = defineModule({
  id: welcomeModuleConfig.moduleId,
  commands: [],
  events: [guildMemberAddEvent, guildMemberRemoveEvent],
  config: welcomeModuleConfig,
});
