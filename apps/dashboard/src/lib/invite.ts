import { buildBotInviteUrl } from "@forgely/shared";

/**
 * The public "Add to Discord" link. The client ID is not a secret (it is in every invite link),
 * so it can live in a NEXT_PUBLIC variable. Falls back to "#" so the page still renders without it.
 */
export function getInviteHref(): string {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  return clientId ? buildBotInviteUrl(clientId) : "#";
}
