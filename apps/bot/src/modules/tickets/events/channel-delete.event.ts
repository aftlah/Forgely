import { Events } from "discord.js";

import { defineEvent } from "../../../core/define";
import { createTicketsRepository } from "../tickets.repository";
import { createTicketsService } from "../tickets.service";

/**
 * When a ticket's channel is deleted in Discord, the ticket is closed in the database too. Without this a
 * deleted channel would keep counting against the person's open-ticket limit forever. It runs whether or
 * not the module is on, because this is bookkeeping, not a feature.
 */
export const channelDeleteEvent = defineEvent({
  name: Events.ChannelDelete,
  async execute(app, channel) {
    if (channel.isDMBased()) return;
    const service = createTicketsService({ repository: createTicketsRepository(app.db) });
    await service.handleChannelDeleted(channel.guildId, channel.id);
  },
});
