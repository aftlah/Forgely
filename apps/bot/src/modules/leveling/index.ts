import { levelingModuleConfig } from "@forgely/shared";

import { defineModule } from "../../core/define";

import { leaderboardCommand } from "./commands/leaderboard.command";
import { rankCommand } from "./commands/rank.command";
import { messageCreateEvent } from "./events/message-create.event";

/** XP for chatting, levels, role rewards, /rank, and /leaderboard. */
export const levelingModule = defineModule({
  id: levelingModuleConfig.moduleId,
  commands: [rankCommand, leaderboardCommand],
  events: [messageCreateEvent],
  config: levelingModuleConfig,
});
