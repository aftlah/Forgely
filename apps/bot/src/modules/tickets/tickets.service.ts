import type { TicketRow } from "@forgely/db";
import type { TicketsConfig } from "@forgely/shared";

import type { Logger } from "../../core/logger";

import type { TicketsRepository } from "./tickets.repository";

/** What the service can do in Discord. The adapter implements it; tests fake it. */
export interface TicketsPort {
  createChannel: (input: {
    name: string;
    categoryId: string;
    openerId: string;
    supportRoleIds: string[];
  }) => Promise<{ channelId: string }>;
  deleteChannel: (channelId: string) => Promise<void>;
  /** The first message in the ticket, with the Close button. */
  sendWelcome: (input: {
    channelId: string;
    openerId: string;
    supportRoleIds: string[];
    ticketNumber: number;
  }) => Promise<void>;
  sendNotice: (channelId: string, content: string) => Promise<void>;
  /** Takes the opener's access away and marks the channel as closed. The channel itself stays. */
  archiveChannel: (channelId: string, openerId: string) => Promise<void>;
  postLog: (channelId: string, content: string) => Promise<void>;
}

export type OpenResult =
  | { status: "opened"; channelId: string; ticketNumber: number }
  | { status: "not-configured" }
  | { status: "limit"; channelIds: string[] };

export type CloseResult =
  { status: "closed"; ticketNumber: number } | { status: "not-a-ticket" } | { status: "forbidden" };

export interface OpenInput {
  guildId: string;
  opener: { id: string; username: string };
  config: TicketsConfig;
  port: TicketsPort;
  logger: Logger;
}

export interface CloseInput {
  guildId: string;
  channelId: string;
  closer: { id: string; roleIds: ReadonlySet<string>; hasManageChannels: boolean };
  config: TicketsConfig;
  port: TicketsPort;
  logger: Logger;
}

const MAX_CHANNEL_NAME_LENGTH = 100;
const CHANNEL_PREFIX = "ticket-";

/** A name Discord accepts: lowercase letters, digits, and dashes. Usernames can be anything, so clean them. */
export function buildTicketChannelName(username: string): string {
  const slug = username
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
    .replaceAll(/^-+|-+$/g, "");
  return `${CHANNEL_PREFIX}${slug || "member"}`.slice(0, MAX_CHANNEL_NAME_LENGTH);
}

/** The person who opened it, anyone with a support role, or anyone who can manage channels. */
export function canCloseTicket(input: {
  openerId: string;
  closer: CloseInput["closer"];
  supportRoleIds: string[];
}): boolean {
  const { openerId, closer, supportRoleIds } = input;
  if (closer.id === openerId || closer.hasManageChannels) return true;
  return supportRoleIds.some((roleId) => closer.roleIds.has(roleId));
}

interface Dependencies {
  repository: TicketsRepository;
}

/** One failing step (a deleted log channel, a missing permission) must not undo a ticket that already exists. */
async function attempt(logger: Logger, step: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    logger.warn({ err: error, step }, "Ticket step failed");
  }
}

/** Posts a line to the log channel, if one is set. */
async function writeLog(input: OpenInput | CloseInput, step: string, line: string): Promise<void> {
  const { logChannelId } = input.config;
  if (!logChannelId) return;
  await attempt(input.logger, step, () => input.port.postLog(logChannelId, line));
}

/**
 * Records the ticket for a channel that was just created. If the person hit the limit in the meantime
 * (two clicks raced), or recording fails, the new channel is removed so none is left behind.
 */
async function recordTicket(
  deps: Dependencies,
  input: OpenInput,
  channelId: string,
): Promise<TicketRow | null> {
  const { guildId, opener, config, port, logger } = input;
  try {
    const ticket = await deps.repository.createIfUnderLimit({
      guildId,
      openerId: opener.id,
      channelId,
      maxOpen: config.maxOpenPerUser,
    });
    if (ticket) return ticket;
  } catch (error) {
    await attempt(logger, "delete-orphan-channel", () => port.deleteChannel(channelId));
    throw error;
  }
  await attempt(logger, "delete-extra-channel", () => port.deleteChannel(channelId));
  return null;
}

async function openTicket(deps: Dependencies, input: OpenInput): Promise<OpenResult> {
  const { guildId, opener, config, port, logger } = input;
  if (!config.categoryId) return { status: "not-configured" };

  // Cheap check first, so a person at the limit never costs a channel.
  const alreadyOpen = await deps.repository.listOpenForUser(guildId, opener.id);
  if (alreadyOpen.length >= config.maxOpenPerUser) {
    return { status: "limit", channelIds: alreadyOpen.map((ticket) => ticket.channelId) };
  }

  const { channelId } = await port.createChannel({
    name: buildTicketChannelName(opener.username),
    categoryId: config.categoryId,
    openerId: opener.id,
    supportRoleIds: config.supportRoleIds,
  });
  const ticket = await recordTicket(deps, input, channelId);
  if (!ticket) {
    const open = await deps.repository.listOpenForUser(guildId, opener.id);
    return { status: "limit", channelIds: open.map((row) => row.channelId) };
  }

  await attempt(logger, "welcome-message", () =>
    port.sendWelcome({
      channelId,
      openerId: opener.id,
      supportRoleIds: config.supportRoleIds,
      ticketNumber: ticket.ticketNumber,
    }),
  );
  await writeLog(
    input,
    "log-opened",
    `Ticket #${ticket.ticketNumber} opened by <@${opener.id}> in <#${channelId}>.`,
  );
  return { status: "opened", channelId, ticketNumber: ticket.ticketNumber };
}

async function closeTicket(deps: Dependencies, input: CloseInput): Promise<CloseResult> {
  const { guildId, channelId, closer, config, port, logger } = input;
  const ticket = await deps.repository.findOpenByChannel(guildId, channelId);
  if (!ticket) return { status: "not-a-ticket" };
  const supportRoleIds = config.supportRoleIds;
  if (!canCloseTicket({ openerId: ticket.openerId, closer, supportRoleIds })) {
    return { status: "forbidden" };
  }

  // The atomic update decides who closes it if two people press the button together.
  const closed = await deps.repository.close(guildId, channelId, closer.id);
  if (!closed) return { status: "not-a-ticket" };

  await attempt(logger, "archive-channel", () => port.archiveChannel(channelId, ticket.openerId));
  await attempt(logger, "closed-notice", () =>
    port.sendNotice(
      channelId,
      `Ticket closed by <@${closer.id}>. The team can delete this channel when they are done with it.`,
    ),
  );
  await writeLog(
    input,
    "log-closed",
    `Ticket #${ticket.ticketNumber} closed by <@${closer.id}>. It was opened by <@${ticket.openerId}>.`,
  );
  return { status: "closed", ticketNumber: ticket.ticketNumber };
}

export function createTicketsService(deps: Dependencies) {
  return {
    openTicket: (input: OpenInput) => openTicket(deps, input),
    closeTicket: (input: CloseInput) => closeTicket(deps, input),
    /** The channel was deleted in Discord, so the ticket can no longer be open. */
    async handleChannelDeleted(guildId: string, channelId: string): Promise<void> {
      await deps.repository.close(guildId, channelId, null);
    },
  };
}
