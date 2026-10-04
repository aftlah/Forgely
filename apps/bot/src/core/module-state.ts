import type { z } from "zod";

import type { ModuleConfigDefinition } from "@forgely/shared";

import type { AppContext } from "./types";

/**
 * For event handlers, which the command router does not gate: returns the module's config
 * when it is enabled for the guild, or undefined when the handler should do nothing.
 */
export async function getConfigIfEnabled<TSchema extends z.ZodType>(
  app: AppContext,
  guildId: string,
  definition: ModuleConfigDefinition<TSchema>,
): Promise<z.infer<TSchema> | undefined> {
  const state = await app.guildConfig.getModuleState(guildId, definition);
  return state.isEnabled ? state.config : undefined;
}
