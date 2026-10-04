import type { GuildMember } from "discord.js";

import type { RolePanelPort } from "./role-panels.service";

const AUDIT_REASON = "Forgely role panel";

/** Connects the service to the member who clicked. */
export function createRolePanelPort(member: GuildMember): RolePanelPort {
  return {
    addRoles: async (roleIds) => {
      await member.roles.add(roleIds, AUDIT_REASON);
    },
    removeRoles: async (roleIds) => {
      await member.roles.remove(roleIds, AUDIT_REASON);
    },
  };
}
