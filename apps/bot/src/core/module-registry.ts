import type { BotEvent, BotModule, ButtonHandler, SlashCommand } from "./types";

export interface RegisteredCommand {
  command: SlashCommand;
  module: BotModule;
}

export interface RegisteredButton {
  handler: ButtonHandler;
  module: BotModule;
}

/**
 * Holds every module and indexes their commands and button handlers. Registration fails loudly on
 * duplicate IDs, command names, or button prefixes, so conflicts surface at startup, not in production.
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, BotModule>();
  private readonly commandsByName = new Map<string, RegisteredCommand>();
  private readonly buttonsByPrefix = new Map<string, RegisteredButton>();

  register(module: BotModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Duplicate module id: "${module.id}"`);
    }
    this.assertNoConflicts(module);

    this.modules.set(module.id, module);
    for (const command of module.commands) {
      this.commandsByName.set(command.data.name, { command, module });
    }
    for (const handler of module.buttons ?? []) {
      this.buttonsByPrefix.set(handler.prefix, { handler, module });
    }
  }

  private assertNoConflicts(module: BotModule): void {
    for (const command of module.commands) {
      const existing = this.commandsByName.get(command.data.name);
      if (existing) {
        throw new Error(
          `Command "/${command.data.name}" in module "${module.id}" is already registered by "${existing.module.id}"`,
        );
      }
    }
    for (const { prefix } of module.buttons ?? []) {
      const existing = this.buttonsByPrefix.get(prefix);
      if (existing) {
        throw new Error(
          `Button prefix "${prefix}" in module "${module.id}" is already registered by "${existing.module.id}"`,
        );
      }
    }
  }

  findCommand(name: string): RegisteredCommand | undefined {
    return this.commandsByName.get(name);
  }

  findButton(prefix: string): RegisteredButton | undefined {
    return this.buttonsByPrefix.get(prefix);
  }

  getCommands(): SlashCommand[] {
    return [...this.commandsByName.values()].map((entry) => entry.command);
  }

  getEvents(): Array<{ event: BotEvent; module: BotModule }> {
    return [...this.modules.values()].flatMap((module) =>
      module.events.map((event) => ({ event, module })),
    );
  }

  getModules(): BotModule[] {
    return [...this.modules.values()];
  }
}

export function createModuleRegistry(modules: BotModule[]): ModuleRegistry {
  const registry = new ModuleRegistry();
  for (const module of modules) registry.register(module);
  return registry;
}
