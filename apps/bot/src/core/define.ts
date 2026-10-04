import type { ClientEvents } from "discord.js";

import type { BotEvent, BotModule, ButtonHandler, SlashCommand } from "./types";

/** Declares a slash command. Exists so every command is written the same way. */
export function defineCommand(command: SlashCommand): SlashCommand {
  return command;
}

/** Declares a button handler, routed by the custom-ID prefix before the first ":". */
export function defineButton(handler: ButtonHandler): ButtonHandler {
  return handler;
}

/**
 * Declares an event handler with its arguments typed from the event name.
 *
 * The cast widens the event type so handlers for different events fit in one list.
 * It is safe because the event name and handler arguments are tied together here.
 */
export function defineEvent<K extends keyof ClientEvents>(event: BotEvent<K>): BotEvent {
  return event as unknown as BotEvent;
}

/** Declares a module. Modules self-register their commands, events, and config schema. */
export function defineModule(module: BotModule): BotModule {
  return module;
}
