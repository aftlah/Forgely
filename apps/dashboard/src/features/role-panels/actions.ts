"use server";

import { revalidatePath } from "next/cache";

import { createGuildConfigRepository, createModuleSettingsRepository } from "@forgely/db";
import type { RolePanelsConfig } from "@forgely/shared";

import { publishRolePanel } from "./publish-role-panel";

import { authorizeGuildAction } from "@/features/settings/authorize-action";
import { getDatabase } from "@/lib/db";
import { getDiscordRest } from "@/lib/discord-rest";

/** What the browser gets back after pressing "Post to channel". */
export type PublishActionResult =
  | { ok: true; posted: "created" | "updated"; config: RolePanelsConfig }
  | { ok: false; message: string };

/**
 * Server Action behind the "Post to channel" button. It authorizes the caller itself, then posts
 * what is SAVED for that panel. Nothing the browser sends decides what ends up in Discord.
 */
export async function publishRolePanelAction(
  guildId: string,
  panelId: string,
): Promise<PublishActionResult> {
  const authorization = await authorizeGuildAction(guildId);
  if (!authorization.ok) return { ok: false, message: authorization.message };

  const db = getDatabase();
  const result = await publishRolePanel(
    {
      findStored: (guild, moduleId) =>
        createGuildConfigRepository(db).findModuleConfig(guild, moduleId),
      saveWithAudit: (input) => createModuleSettingsRepository(db).saveWithAudit(input),
      discord: getDiscordRest(),
    },
    { guildId, panelId, actorId: authorization.actorId },
  );

  if (result.ok) revalidatePath(`/dashboard/${guildId}`, "layout");
  return result;
}
