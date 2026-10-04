import { BOT_INVITE_PERMISSIONS, NO_PERMISSIONS } from "./constants";

const INVITE_SCOPES = ["bot", "applications.commands"];

/** Sum of every permission in `BOT_INVITE_PERMISSIONS`, as the decimal string Discord expects. */
export function getBotInvitePermissions(): string {
  return Object.values(BOT_INVITE_PERMISSIONS)
    .reduce((total, bit) => total | bit, NO_PERMISSIONS)
    .toString();
}

interface InviteOptions {
  /** Pre-select a server and lock the picker, for the "Add bot" button next to a specific server. */
  guildId?: string;
}

/** The "Add to Discord" link. Asks only for the permissions the features use, never Administrator. */
export function buildBotInviteUrl(clientId: string, options: InviteOptions = {}): string {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", INVITE_SCOPES.join(" "));
  url.searchParams.set("permissions", getBotInvitePermissions());
  if (options.guildId) {
    url.searchParams.set("guild_id", options.guildId);
    url.searchParams.set("disable_guild_select", "true");
  }
  return url.toString();
}
