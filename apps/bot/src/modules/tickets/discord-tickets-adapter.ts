import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type Guild,
  type GuildTextBasedChannel,
} from "discord.js";

import { buildTicketButtonId, NotFoundError, TICKET_CLOSE_ACTION } from "@forgely/shared";

import { sendToGuildChannel } from "../../core/send-to-guild-channel";

import type { TicketsPort } from "./tickets.service";

const AUDIT_REASON = "Forgely ticket";
const MAX_CHANNEL_NAME_LENGTH = 100;
const CLOSED_PREFIX = "closed-";
const TICKET_PREFIX = "ticket-";

/** What the person and the support team may do in a ticket: see it and talk. Nothing more is granted. */
const MEMBER_ACCESS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
];

type CreateInput = Parameters<TicketsPort["createChannel"]>[0];
type WelcomeInput = Parameters<TicketsPort["sendWelcome"]>[0];

async function fetchTicketChannel(guild: Guild, channelId: string): Promise<GuildTextBasedChannel> {
  const channel = await guild.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    throw new NotFoundError(`Ticket channel ${channelId} is missing or cannot receive messages`);
  }
  return channel;
}

async function createChannel(guild: Guild, input: CreateInput): Promise<{ channelId: string }> {
  const { name, categoryId, openerId, supportRoleIds } = input;
  // A support role deleted after it was saved would make Discord refuse the whole channel.
  const liveRoleIds = supportRoleIds.filter((id) => guild.roles.cache.has(id));
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: categoryId,
    reason: AUDIT_REASON,
    // The type is spelled out because without it discord.js looks the ID up in its cache, and a member who has
    // not spoken since the bot started is not there: creating the channel would fail for exactly those people.
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      { id: openerId, type: OverwriteType.Member, allow: MEMBER_ACCESS },
      ...liveRoleIds.map((id) => ({ id, type: OverwriteType.Role, allow: MEMBER_ACCESS })),
      {
        id: guild.client.user.id,
        type: OverwriteType.Member,
        allow: [...MEMBER_ACCESS, PermissionFlagsBits.ManageChannels],
      },
    ],
  });
  return { channelId: channel.id };
}

async function sendWelcome(guild: Guild, input: WelcomeInput): Promise<void> {
  const { channelId, openerId, supportRoleIds, ticketNumber } = input;
  const channel = await fetchTicketChannel(guild, channelId);
  const team = supportRoleIds.map((id) => `<@&${id}>`).join(" ");
  const closeButton = new ButtonBuilder()
    .setCustomId(buildTicketButtonId(TICKET_CLOSE_ACTION))
    .setLabel("Close ticket")
    .setStyle(ButtonStyle.Secondary);
  await channel.send({
    content: [
      `<@${openerId}> ${team}`.trim(),
      `Ticket #${ticketNumber} is open. Tell us what you need and someone will help you here.`,
    ].join("\n"),
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton)],
    // Only the person and the support roles can be pinged, never @everyone or @here.
    allowedMentions: { users: [openerId], roles: supportRoleIds },
  });
}

/** Removes the person's access and renames the channel. Nothing is deleted. */
async function archiveChannel(guild: Guild, channelId: string, openerId: string): Promise<void> {
  const channel = await guild.channels.fetch(channelId);
  if (channel?.type !== ChannelType.GuildText) return;
  // Dropping the person's own overwrite leaves them with the @everyone rule: no access.
  await channel.permissionOverwrites.delete(openerId, AUDIT_REASON);
  const base = channel.name.startsWith(TICKET_PREFIX)
    ? channel.name.slice(TICKET_PREFIX.length)
    : channel.name;
  await channel.setName(`${CLOSED_PREFIX}${base}`.slice(0, MAX_CHANNEL_NAME_LENGTH), AUDIT_REASON);
}

/** Connects the tickets service to one server. */
export function createTicketsPort(guild: Guild): TicketsPort {
  return {
    createChannel: (input) => createChannel(guild, input),
    sendWelcome: (input) => sendWelcome(guild, input),
    archiveChannel: (channelId, openerId) => archiveChannel(guild, channelId, openerId),
    postLog: (channelId, content) => sendToGuildChannel(guild, channelId, content),

    async deleteChannel(channelId) {
      const channel = await guild.channels.fetch(channelId);
      await channel?.delete(AUDIT_REASON);
    },

    async sendNotice(channelId, content) {
      const channel = await fetchTicketChannel(guild, channelId);
      await channel.send({ content, allowedMentions: { parse: [] } });
    },
  };
}
