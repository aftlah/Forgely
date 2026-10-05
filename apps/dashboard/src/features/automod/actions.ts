"use server";

import { createGuildConfigRepository } from "@forgely/db";
import { AUTOMOD_MODULE_ID, automodConfigSchema } from "@forgely/shared";

import { syncAutomod, type SyncResult } from "./sync-automod";

import { authorizeGuildAction } from "@/features/settings/authorize-action";
import { getDatabase } from "@/lib/db";
import { getAutomodRest } from "@/lib/discord-automod-rest";

/**
 * Server Action that makes Discord's AutoMod match what is SAVED. It authorizes the caller itself and reads the
 * settings from the database, so nothing the browser sends decides which rules exist in Discord.
 */
export async function syncAutomodAction(guildId: string): Promise<SyncResult> {
  const authorization = await authorizeGuildAction(guildId);
  if (!authorization.ok) return { ok: false, message: authorization.message };

  const stored = await createGuildConfigRepository(getDatabase()).findModuleConfig(
    guildId,
    AUTOMOD_MODULE_ID,
  );
  const config = automodConfigSchema.safeParse(stored?.config);
  if (!stored || !config.success) return { ok: false, message: "Save the settings first." };

  return syncAutomod(
    { rest: getAutomodRest() },
    { guildId, isEnabled: stored.isEnabled, config: config.data },
  );
}
