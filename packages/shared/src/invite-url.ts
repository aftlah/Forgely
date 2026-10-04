import { BOT_INVITE_PERMISSIONS, NO_PERMISSIONS } from "./constants";

const INVITE_SCOPES = ["bot", "applications.commands"];

/** Sum of every permission above, as the decimal string Discord's authorize URL expects. */
export function getBotInvitePermissions(): string {
  return Object.values(BOT_INVITE_PERMISSIONS)
    .reduce((total, bit) => total | bit, NO_PERMISSIONS)
    .toString();
}

/** The "Add to Discord" link. Asks only for the permissions the features use, never Administrator. */
export function buildBotInviteUrl(clientId: string): string {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", INVITE_SCOPES.join(" "));
  url.searchParams.set("permissions", getBotInvitePermissions());
  return url.toString();
}
