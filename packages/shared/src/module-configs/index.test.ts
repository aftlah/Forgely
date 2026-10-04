import { describe, expect, it } from "vitest";

import { isConfigurableModuleId, MODULE_CONFIGS } from "./index";

describe("MODULE_CONFIGS", () => {
  it("is keyed by each definition's own module id", () => {
    for (const [key, definition] of Object.entries(MODULE_CONFIGS)) {
      expect(definition.moduleId).toBe(key);
    }
  });

  it("ships defaults that pass their own schema", () => {
    for (const definition of Object.values(MODULE_CONFIGS)) {
      expect(definition.schema.safeParse(definition.defaults).success).toBe(true);
    }
  });
});

describe("isConfigurableModuleId", () => {
  it("accepts known modules and rejects everything else, including inherited object keys", () => {
    expect(isConfigurableModuleId("welcome")).toBe(true);
    expect(isConfigurableModuleId("moderation")).toBe(true);
    expect(isConfigurableModuleId("system")).toBe(false);
    expect(isConfigurableModuleId("constructor")).toBe(false);
    expect(isConfigurableModuleId("__proto__")).toBe(false);
  });
});
