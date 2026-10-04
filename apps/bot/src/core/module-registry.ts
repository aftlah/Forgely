import type { BotEvent, BotModule, SlashCommand } from "./types";

export interface RegisteredCommand {
  command: SlashCommand;
  module: BotModule;
}

/**
 * Holds every module and indexes their commands. Registration fails loudly on
 * duplicate IDs or command names, so conflicts surface at startup rather than in production.
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, BotModule>();
  private readonly commandsByName = new Map<string, RegisteredCommand>();

  register(module: BotModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Duplicate module id: "${module.id}"`);
    }
    for (const command of module.commands) {
      const existing = this.commandsByName.get(command.data.name);
      if (existing) {
        throw new Error(
          `Command "/${command.data.name}" in module "${module.id}" is already registered by "${existing.module.id}"`,
        );
      }
    }

    this.modules.set(module.id, module);
    for (const command of module.commands) {
      this.commandsByName.set(command.data.name, { command, module });
    }
  }

  findCommand(name: string): RegisteredCommand | undefined {
    return this.commandsByName.get(name);
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
