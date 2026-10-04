import { describe, expect, it, vi } from "vitest";

import { defineCommand, defineModule } from "./define";
import { createModuleRegistry } from "./module-registry";

function createCommand(name: string) {
  return defineCommand({
    data: { name, toJSON: () => ({ name, description: name }) },
    execute: vi.fn(),
  });
}

describe("ModuleRegistry", () => {
  it("indexes commands by name and remembers their module", () => {
    const moduleA = defineModule({ id: "a", commands: [createCommand("one")], events: [] });
    const registry = createModuleRegistry([moduleA]);

    expect(registry.findCommand("one")?.module.id).toBe("a");
    expect(registry.findCommand("missing")).toBeUndefined();
  });

  it("rejects duplicate module ids", () => {
    const first = defineModule({ id: "a", commands: [], events: [] });
    const second = defineModule({ id: "a", commands: [], events: [] });

    expect(() => createModuleRegistry([first, second])).toThrow(/Duplicate module id/);
  });

  it("rejects the same command name in two modules, naming both", () => {
    const first = defineModule({ id: "a", commands: [createCommand("dup")], events: [] });
    const second = defineModule({ id: "b", commands: [createCommand("dup")], events: [] });

    expect(() => createModuleRegistry([first, second])).toThrow(/"b".*"a"/);
  });
});
