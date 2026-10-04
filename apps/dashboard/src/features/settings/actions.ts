"use server";

import { revalidatePath } from "next/cache";

import { authorizeGuildAction, type DeniedReason } from "./authorize-action";
import { createSaveDependencies } from "./save-dependencies";
import { saveModuleSettings, type SaveResult } from "./save-module-settings";

/** What the browser gets back. Only what the form needs: never raw records or internal errors. */
export type SaveActionResult =
  | SaveResult
  | { ok: false; reason: DeniedReason; message: string; fieldErrors: Record<string, string> };

/** Server Action behind the Save button. It authorizes the caller itself before touching anything. */
export async function saveModuleSettingsAction(
  guildId: string,
  moduleId: string,
  isEnabled: boolean,
  config: unknown,
): Promise<SaveActionResult> {
  const authorization = await authorizeGuildAction(guildId);
  if (!authorization.ok) return { ...authorization, fieldErrors: {} };

  const result = await saveModuleSettings(createSaveDependencies(), {
    guildId,
    moduleId,
    actorId: authorization.actorId,
    isEnabled,
    config,
  });
  if (result.ok) revalidatePath(`/dashboard/${guildId}`, "layout");
  return result;
}
