import { defineModule } from "../../core/define";

import { pingCommand } from "./commands/ping.command";
import { guildCreateEvent } from "./events/guild-create.event";
import { guildDeleteEvent } from "./events/guild-delete.event";
import { syncGuildsOnReadyEvent } from "./events/sync-guilds-on-ready.event";

/** Core bot plumbing: health command and guild bookkeeping. Always on; has no dashboard toggle. */
export const systemModule = defineModule({
  id: "system",
  commands: [pingCommand],
  events: [guildCreateEvent, guildDeleteEvent, syncGuildsOnReadyEvent],
});
