import type { BotModule } from "../core/types";

import { moderationModule } from "./moderation";
import { systemModule } from "./system";
import { welcomeModule } from "./welcome";

/** Every module the bot loads. To add a module, create its folder and add it here. */
export const botModules: BotModule[] = [systemModule, welcomeModule, moderationModule];
