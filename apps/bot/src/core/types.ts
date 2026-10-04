import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import type { z } from "zod";

import type { Database, GuildRepository } from "@forgely/db";
import type { ModuleConfigDefinition } from "@forgely/shared";

import type { GuildConfigService } from "../sync/guild-config-service";

import type { Logger } from "./logger";

/** Long-lived dependencies, created once at startup and passed into handlers. */
export interface AppContext {
  logger: Logger;
  /** For module repositories. Handlers must not query it directly. */
  db: Database;
  guildConfig: GuildConfigService;
  guildRepository: GuildRepository;
}

/** Everything a command needs. `logger` is already tagged with guild, user, and command. */
export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  app: AppContext;
  logger: Logger;
}

export interface SlashCommand {
  /** A discord.js SlashCommandBuilder (or anything that serializes like one). */
  data: { name: string; toJSON: () => RESTPostAPIChatInputApplicationCommandsJSONBody };
  execute: (context: CommandContext) => Promise<void>;
}

/** Everything a button handler needs. `parts` are the pieces of the custom ID after the prefix. */
export interface ButtonContext {
  interaction: ButtonInteraction;
  app: AppContext;
  logger: Logger;
  parts: string[];
}

/**
 * Handles clicks on buttons whose custom ID starts with `prefix` followed by ":" (for example `rp:...`).
 * Prefixes are unique across modules. Anyone can click a button, so handlers must not trust the ID.
 */
export interface ButtonHandler {
  prefix: string;
  execute: (context: ButtonContext) => Promise<void>;
}

export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (app: AppContext, ...args: ClientEvents[K]) => Promise<void>;
}

export interface BotModule {
  /** Stable identifier. Also the key for per-guild config rows. */
  id: string;
  commands: SlashCommand[];
  events: BotEvent[];
  /** Optional: handlers for the buttons this module puts in messages. */
  buttons?: ButtonHandler[];
  /**
   * Per-guild config definition. Modules without one (for example `system`)
   * are always enabled and cannot be toggled from the dashboard.
   */
  config?: ModuleConfigDefinition<z.ZodType>;
}
