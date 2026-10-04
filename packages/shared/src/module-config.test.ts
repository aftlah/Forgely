import { describe, expect, it } from "vitest";
import { z } from "zod";

import { defineModuleConfig, parseStoredConfig } from "./module-config";

const definition = defineModuleConfig({
  moduleId: "example",
  version: 2,
  schema: z.object({ channelId: z.string().nullable(), isActive: z.boolean() }),
  defaults: { channelId: null, isActive: false },
  upgrades: {
    // v1 stored `channel`; v2 renamed it to `channelId` and added `isActive`.
    1: (old) => ({ channelId: (old as { channel?: string }).channel ?? null, isActive: true }),
  },
});

describe("parseStoredConfig", () => {
  it("returns defaults when nothing is stored", () => {
    expect(parseStoredConfig(definition, undefined)).toEqual(definition.defaults);
  });

  it("returns stored config at the current version", () => {
    const stored = { version: 2, config: { channelId: "123", isActive: true } };
    expect(parseStoredConfig(definition, stored)).toEqual({ channelId: "123", isActive: true });
  });

  it("upgrades old versions step by step", () => {
    const stored = { version: 1, config: { channel: "456" } };
    expect(parseStoredConfig(definition, stored)).toEqual({ channelId: "456", isActive: true });
  });

  it("falls back to defaults when data fails validation", () => {
    const stored = { version: 2, config: { channelId: 5 } };
    expect(parseStoredConfig(definition, stored)).toEqual(definition.defaults);
  });

  it("falls back to defaults when an upgrade step is missing", () => {
    const stored = { version: 0, config: {} };
    expect(parseStoredConfig(definition, stored)).toEqual(definition.defaults);
  });
});
