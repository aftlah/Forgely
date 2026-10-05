import { ticketsModuleConfig } from "@forgely/shared";

import { defineModule } from "../../core/define";

import { ticketButton } from "./buttons/ticket.button";
import { channelDeleteEvent } from "./events/channel-delete.event";

/**
 * Support tickets: a panel message with an "open" button, a private channel per ticket, and a "close"
 * button inside it. The panel is posted from the dashboard; this module handles the clicks. It needs no
 * commands and no special intents (it never reads message text, so no Message Content intent).
 */
export const ticketsModule = defineModule({
  id: ticketsModuleConfig.moduleId,
  commands: [],
  events: [channelDeleteEvent],
  buttons: [ticketButton],
  config: ticketsModuleConfig,
});
