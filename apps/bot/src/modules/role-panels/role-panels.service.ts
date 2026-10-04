import type { RolePanelsConfig } from "@forgely/shared";

import type { Logger } from "../../core/logger";

/** What the service can do to the member who clicked. The adapter implements it; tests fake it. */
export interface RolePanelPort {
  addRoles: (roleIds: string[]) => Promise<void>;
  removeRoles: (roleIds: string[]) => Promise<void>;
}

export interface ClickInput {
  config: RolePanelsConfig;
  panelId: string;
  roleId: string;
  /** The roles the member has right now. */
  memberRoleIds: ReadonlySet<string>;
  port: RolePanelPort;
  logger: Logger;
}

const PANEL_GONE_MESSAGE =
  "This panel has been changed or removed, so that button no longer does anything.";
const CANNOT_MANAGE_MESSAGE =
  "I couldn't change that role. Ask a server admin to move the Forgely role above it in Server Settings.";

const role = (id: string): string => `<@&${id}>`;

/**
 * Works out what a click does and does it. Returns the private reply for the member.
 * The IDs in the button come from the browser, so they are checked against the saved panel: a role
 * that is not one of the panel's buttons can never be handed out through it.
 */
export async function handleRolePanelClick(input: ClickInput): Promise<string> {
  const { config, panelId, roleId, memberRoleIds, port, logger } = input;

  const panel = config.panels.find((candidate) => candidate.id === panelId);
  if (!panel?.buttons.some((button) => button.roleId === roleId)) return PANEL_GONE_MESSAGE;

  const hasRole = memberRoleIds.has(roleId);
  const swapOut =
    panel.mode === "unique" && !hasRole
      ? panel.buttons
          .map((button) => button.roleId)
          .filter((id) => id !== roleId && memberRoleIds.has(id))
      : [];

  try {
    if (hasRole) {
      await port.removeRoles([roleId]);
      return `Removed ${role(roleId)}.`;
    }
    if (swapOut.length > 0) await port.removeRoles(swapOut);
    await port.addRoles([roleId]);
  } catch (error) {
    logger.warn({ err: error, panelId, roleId }, "Could not change a role from a panel");
    return CANNOT_MANAGE_MESSAGE;
  }

  const swapped = swapOut.length > 0 ? ` (removed ${swapOut.map(role).join(", ")})` : "";
  return `Added ${role(roleId)}${swapped}.`;
}
