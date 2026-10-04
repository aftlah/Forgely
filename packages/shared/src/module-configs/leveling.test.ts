import { describe, expect, it } from "vitest";

import { levelingConfigSchema, levelingModuleConfig } from "./leveling";

const ROLE_A = "200000000000000001";
const ROLE_B = "200000000000000002";
const CHANNEL = "100000000000000001";

function config(patch: Record<string, unknown> = {}) {
  return { ...levelingModuleConfig.defaults, ...patch };
}

function issuePaths(input: unknown): string[] {
  const result = levelingConfigSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("levelingConfigSchema", () => {
  it("accepts the defaults", () => {
    expect(levelingConfigSchema.safeParse(levelingModuleConfig.defaults).success).toBe(true);
  });

  it("rejects a maximum XP below the minimum, pointing at the maximum field", () => {
    expect(issuePaths(config({ xp: { min: 20, max: 10, cooldownSeconds: 60 } }))).toContain(
      "xp.max",
    );
  });

  it("accepts equal minimum and maximum (a fixed amount)", () => {
    expect(
      levelingConfigSchema.safeParse(config({ xp: { min: 10, max: 10, cooldownSeconds: 0 } }))
        .success,
    ).toBe(true);
  });

  it("requires a channel when level-up messages go to a specific channel", () => {
    const levelUp = { mode: "channel", channelId: null, message: "GG" };
    expect(issuePaths(config({ levelUp }))).toContain("levelUp.channelId");
    expect(
      levelingConfigSchema.safeParse(config({ levelUp: { ...levelUp, channelId: CHANNEL } }))
        .success,
    ).toBe(true);
  });

  it("does not need a channel for 'same-channel' or 'off'", () => {
    for (const mode of ["same-channel", "off"]) {
      expect(
        levelingConfigSchema.safeParse(
          config({ levelUp: { mode, channelId: null, message: "GG" } }),
        ).success,
      ).toBe(true);
    }
  });

  it("rejects two rewards for the same level", () => {
    const roleRewards = [
      { level: 5, roleId: ROLE_A },
      { level: 5, roleId: ROLE_B },
    ];
    expect(issuePaths(config({ roleRewards }))).toContain("roleRewards");
  });

  it("rejects out-of-range numbers and malformed role IDs", () => {
    expect(
      levelingConfigSchema.safeParse(config({ xp: { min: 0, max: 5, cooldownSeconds: 60 } }))
        .success,
    ).toBe(false);
    expect(
      levelingConfigSchema.safeParse(config({ xp: { min: 1, max: 101, cooldownSeconds: 60 } }))
        .success,
    ).toBe(false);
    expect(
      levelingConfigSchema.safeParse(config({ xp: { min: 1, max: 5, cooldownSeconds: 3601 } }))
        .success,
    ).toBe(false);
    expect(
      levelingConfigSchema.safeParse(config({ roleRewards: [{ level: 1, roleId: "nope" }] }))
        .success,
    ).toBe(false);
  });

  it("explains number errors in plain words", () => {
    const messageAt = (patch: Record<string, unknown>, path: string): string | undefined => {
      const result = levelingConfigSchema.safeParse(config(patch));
      return result.success
        ? undefined
        : result.error.issues.find((issue) => issue.path.join(".") === path)?.message;
    };

    expect(messageAt({ xp: { min: 0, max: 5, cooldownSeconds: 60 } }, "xp.min")).toBe(
      "Must be at least 1.",
    );
    expect(messageAt({ xp: { min: 1, max: 500, cooldownSeconds: 60 } }, "xp.max")).toBe(
      "Must be 100 or less.",
    );
    expect(messageAt({ xp: { min: 1.5, max: 5, cooldownSeconds: 60 } }, "xp.min")).toBe(
      "Enter a whole number.",
    );
  });

  it("limits the number of role rewards", () => {
    const tooMany = Array.from({ length: 21 }, (_, index) => ({
      level: index + 1,
      roleId: ROLE_A,
    }));
    expect(levelingConfigSchema.safeParse(config({ roleRewards: tooMany })).success).toBe(false);
  });
});
