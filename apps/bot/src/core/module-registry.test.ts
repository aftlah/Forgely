import { describe, expect, it, vi } from "vitest";

import { defineButton, defineCommand, defineModule } from "./define";
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

  it("indexes button handlers by prefix and remembers their module", () => {
    const handler = defineButton({ prefix: "rp", execute: vi.fn() });
    const registry = createModuleRegistry([
      defineModule({ id: "a", commands: [], events: [], buttons: [handler] }),
    ]);

    expect(registry.findButton("rp")?.module.id).toBe("a");
    expect(registry.findButton("nope")).toBeUndefined();
  });

  it("works for modules that declare no buttons", () => {
    const registry = createModuleRegistry([defineModule({ id: "a", commands: [], events: [] })]);

    expect(registry.findButton("rp")).toBeUndefined();
  });

  it("rejects the same button prefix in two modules, naming both", () => {
    const button = () => defineButton({ prefix: "rp", execute: vi.fn() });
    const first = defineModule({ id: "a", commands: [], events: [], buttons: [button()] });
    const second = defineModule({ id: "b", commands: [], events: [], buttons: [button()] });

    expect(() => createModuleRegistry([first, second])).toThrow(/prefix "rp".*"b".*"a"/);
  });
});
