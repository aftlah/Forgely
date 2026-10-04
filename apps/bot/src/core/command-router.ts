import type { Interaction } from "discord.js";

import { ModuleDisabledError, NotFoundError } from "@forgely/shared";

import { handleCommandError } from "./error-handler";
import type { ModuleRegistry, RegisteredCommand } from "./module-registry";
import type { AppContext } from "./types";

/** Throws unless the command's module is turned on for this guild. Modules without config are always on. */
async function assertModuleEnabled(
  { module }: RegisteredCommand,
  guildId: string | null,
  app: AppContext,
): Promise<void> {
  if (!module.config) return;
  if (!guildId) throw new ModuleDisabledError(module.id);

  const state = await app.guildConfig.getModuleState(guildId, module.config);
  if (!state.isEnabled) throw new ModuleDisabledError(module.id);
}

/**
 * Builds the `interactionCreate` listener. It stays thin on purpose: look up the command,
 * check the module is enabled, run it, and route every failure to the central error handler.
 */
export function createCommandRouter(registry: ModuleRegistry, app: AppContext) {
  return async function routeInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const match = registry.findCommand(interaction.commandName);
    const logger = app.logger.child({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      module: match?.module.id,
      command: interaction.commandName,
    });

    try {
      if (!match) {
        throw new NotFoundError(
          `Unknown command "${interaction.commandName}"`,
          "I don't know that command.",
        );
      }
      await assertModuleEnabled(match, interaction.guildId, app);
      await match.command.execute({ interaction, app, logger });
    } catch (error) {
      await handleCommandError(interaction, error, logger);
    }
  };
}
