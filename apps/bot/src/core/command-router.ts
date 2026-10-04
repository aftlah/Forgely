import type { ButtonInteraction, ChatInputCommandInteraction, Interaction } from "discord.js";

import { ModuleDisabledError, NotFoundError } from "@forgely/shared";

import { handleCommandError } from "./error-handler";
import type { ModuleRegistry } from "./module-registry";
import type { AppContext, BotModule } from "./types";

/** Throws unless the module is turned on for this guild. Modules without config are always on. */
async function assertModuleEnabled(
  module: BotModule,
  guildId: string | null,
  app: AppContext,
): Promise<void> {
  if (!module.config) return;
  if (!guildId) throw new ModuleDisabledError(module.id);

  const state = await app.guildConfig.getModuleState(guildId, module.config);
  if (!state.isEnabled) throw new ModuleDisabledError(module.id);
}

async function routeCommand(
  interaction: ChatInputCommandInteraction,
  registry: ModuleRegistry,
  app: AppContext,
): Promise<void> {
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
    await assertModuleEnabled(match.module, interaction.guildId, app);
    await match.command.execute({ interaction, app, logger });
  } catch (error) {
    await handleCommandError(interaction, error, logger);
  }
}

/** A button's custom ID is `<prefix>:<part>:<part>...`. The prefix picks the module's handler. */
async function routeButton(
  interaction: ButtonInteraction,
  registry: ModuleRegistry,
  app: AppContext,
): Promise<void> {
  const [prefix = "", ...parts] = interaction.customId.split(":");
  const match = registry.findButton(prefix);
  const logger = app.logger.child({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    module: match?.module.id,
    button: prefix,
  });

  try {
    if (!match) {
      throw new NotFoundError(
        `Unknown button prefix "${prefix}"`,
        "This button doesn't work any more.",
      );
    }
    await assertModuleEnabled(match.module, interaction.guildId, app);
    await match.handler.execute({ interaction, app, logger, parts });
  } catch (error) {
    await handleCommandError(interaction, error, logger);
  }
}

/**
 * Builds the `interactionCreate` listener. It stays thin on purpose: find the handler, check the
 * module is enabled, run it, and route every failure to the central error handler.
 * Other interaction kinds (menus, modals, autocomplete) are not used yet and are ignored.
 */
export function createCommandRouter(registry: ModuleRegistry, app: AppContext) {
  return async function routeInteraction(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) return routeCommand(interaction, registry, app);
    if (interaction.isButton()) return routeButton(interaction, registry, app);
  };
}
