import { MessageFlags, PermissionFlagsBits, type ButtonInteraction } from "discord.js";

import {
  NotFoundError,
  TICKET_BUTTON_PREFIX,
  TICKET_CLOSE_ACTION,
  TICKET_OPEN_ACTION,
  ticketsModuleConfig,
} from "@forgely/shared";

import { defineButton } from "../../../core/define";
import type { ButtonContext } from "../../../core/types";
import { createTicketsPort } from "../discord-tickets-adapter";
import { createTicketsRepository } from "../tickets.repository";
import { createTicketsService, type CloseResult, type OpenResult } from "../tickets.service";

type TicketContext = Omit<ButtonContext, "interaction"> & {
  interaction: ButtonInteraction<"cached">;
};

const channelLink = (id: string): string => `<#${id}>`;

function describeOpenResult(result: OpenResult): string {
  switch (result.status) {
    case "opened":
      return `Your ticket is open: ${channelLink(result.channelId)}`;
    case "limit":
      return `You already have an open ticket: ${result.channelIds.map(channelLink).join(", ")}`;
    case "not-configured":
      return "Tickets aren't set up on this server yet. Ask an admin to choose a category.";
  }
}

function describeCloseResult(result: CloseResult): string {
  switch (result.status) {
    case "closed":
      return `Ticket #${result.ticketNumber} is closed.`;
    case "forbidden":
      return "Only the person who opened this ticket or the support team can close it.";
    case "not-a-ticket":
      return "This isn't an open ticket.";
  }
}

async function handleOpen({ interaction, app, logger }: TicketContext): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { config } = await app.guildConfig.getModuleState(interaction.guildId, ticketsModuleConfig);
  const service = createTicketsService({ repository: createTicketsRepository(app.db) });

  const result = await service.openTicket({
    guildId: interaction.guildId,
    opener: { id: interaction.user.id, username: interaction.user.username },
    config,
    port: createTicketsPort(interaction.guild),
    logger,
  });
  await interaction.editReply({ content: describeOpenResult(result) });
}

async function handleClose({ interaction, app, logger }: TicketContext): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { config } = await app.guildConfig.getModuleState(interaction.guildId, ticketsModuleConfig);
  const service = createTicketsService({ repository: createTicketsRepository(app.db) });

  const result = await service.closeTicket({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    closer: {
      id: interaction.user.id,
      roleIds: new Set(interaction.member.roles.cache.keys()),
      hasManageChannels: interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels),
    },
    config,
    port: createTicketsPort(interaction.guild),
    logger,
  });
  await interaction.editReply({ content: describeCloseResult(result) });
}

/**
 * Clicks on the ticket panel's "open" button and the "close" button inside a ticket. Anyone can press
 * either, so the service decides who may do what from the saved config and the stored ticket, never
 * from the button.
 */
export const ticketButton = defineButton({
  prefix: TICKET_BUTTON_PREFIX,

  async execute(context) {
    const { interaction, parts } = context;
    if (!interaction.inCachedGuild()) {
      throw new NotFoundError(
        "Ticket button outside a cached guild",
        "This button doesn't work here.",
      );
    }
    const cached: TicketContext = { ...context, interaction };

    if (parts[0] === TICKET_OPEN_ACTION) return handleOpen(cached);
    if (parts[0] === TICKET_CLOSE_ACTION) return handleClose(cached);
    throw new NotFoundError("Unknown ticket button", "This button doesn't work any more.");
  },
});
