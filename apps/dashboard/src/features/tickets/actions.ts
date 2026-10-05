"use server";

import { revalidatePath } from "next/cache";

import { createGuildConfigRepository, createModuleSettingsRepository } from "@forgely/db";

import { publishTicketPanel, type PublishTicketResult } from "./publish-ticket-panel";

import { authorizeGuildAction } from "@/features/settings/authorize-action";
import { getDatabase } from "@/lib/db";
import { getDiscordRest } from "@/lib/discord-rest";

/**
 * Server Action behind "Post panel". It authorizes the caller itself, then posts what is SAVED.
 * Nothing the browser sends decides what ends up in Discord.
 */
export async function publishTicketPanelAction(guildId: string): Promise<PublishTicketResult> {
  const authorization = await authorizeGuildAction(guildId);
  if (!authorization.ok) return { ok: false, message: authorization.message };

  const db = getDatabase();
  const result = await publishTicketPanel(
    {
      findStored: (guild, moduleId) =>
        createGuildConfigRepository(db).findModuleConfig(guild, moduleId),
      saveWithAudit: (input) => createModuleSettingsRepository(db).saveWithAudit(input),
      discord: getDiscordRest(),
    },
    { guildId, actorId: authorization.actorId },
  );

  if (result.ok) revalidatePath(`/dashboard/${guildId}`, "layout");
  return result;
}
