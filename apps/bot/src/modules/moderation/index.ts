import { moderationModuleConfig } from "@forgely/shared";

import { defineModule } from "../../core/define";

import { banCommand } from "./commands/ban.command";
import { kickCommand } from "./commands/kick.command";
import { purgeCommand } from "./commands/purge.command";
import { timeoutCommand } from "./commands/timeout.command";
import { warnCommand } from "./commands/warn.command";
import { warningsCommand } from "./commands/warnings.command";

/** Ban, kick, timeout, warn, purge, with a stored case history and an optional mod-log channel. */
export const moderationModule = defineModule({
  id: moderationModuleConfig.moduleId,
  commands: [banCommand, kickCommand, timeoutCommand, warnCommand, warningsCommand, purgeCommand],
  events: [],
  config: moderationModuleConfig,
});
