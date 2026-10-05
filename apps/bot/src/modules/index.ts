import type { BotModule } from "../core/types";

import { levelingModule } from "./leveling";
import { moderationModule } from "./moderation";
import { rolePanelsModule } from "./role-panels";
import { systemModule } from "./system";
import { ticketsModule } from "./tickets";
import { welcomeModule } from "./welcome";

/** Every module the bot loads. To add a module, create its folder and add it here. */
export const botModules: BotModule[] = [
  systemModule,
  welcomeModule,
  moderationModule,
  levelingModule,
  rolePanelsModule,
  ticketsModule,
];
