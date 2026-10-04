import { DISCORD_PERMISSION_FLAGS } from "./constants";

/**
 * Returns true if a Discord permission bitfield (string from the API) grants
 * MANAGE_GUILD. Administrators always pass, matching Discord's own behavior.
 */
export function hasManageGuildPermission(permissionBitfield: string): boolean {
  const permissions = BigInt(permissionBitfield);
  const { administrator, manageGuild } = DISCORD_PERMISSION_FLAGS;
  const isAdministrator = (permissions & administrator) === administrator;
  const canManageGuild = (permissions & manageGuild) === manageGuild;
  return isAdministrator || canManageGuild;
}
