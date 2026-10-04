import { describe, expect, it } from "vitest";

import { calculateLevelFromXp, getLevelProgress, xpForLevel, xpToNextLevel } from "./xp-math";

describe("xpToNextLevel", () => {
  it("follows 5n² + 50n + 100", () => {
    expect([0, 1, 2, 3].map(xpToNextLevel)).toEqual([100, 155, 220, 295]);
  });
});

describe("xpForLevel", () => {
  it("is the running total of the per-level costs", () => {
    expect([0, 1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 255, 475, 770]);
  });

  it("agrees with adding the costs up one by one, for many levels", () => {
    let total = 0;
    for (let level = 0; level <= 200; level += 1) {
      expect(xpForLevel(level)).toBe(total);
      total += xpToNextLevel(level);
    }
  });

  it("treats a level below zero as zero", () => {
    expect(xpForLevel(-5)).toBe(0);
  });
});

describe("calculateLevelFromXp", () => {
  it("changes level exactly at each threshold", () => {
    expect(calculateLevelFromXp(0)).toBe(0);
    expect(calculateLevelFromXp(99)).toBe(0);
    expect(calculateLevelFromXp(100)).toBe(1);
    expect(calculateLevelFromXp(254)).toBe(1);
    expect(calculateLevelFromXp(255)).toBe(2);
  });

  it("is the inverse of xpForLevel", () => {
    for (let level = 0; level <= 300; level += 1) {
      expect(calculateLevelFromXp(xpForLevel(level))).toBe(level);
      expect(calculateLevelFromXp(xpForLevel(level + 1) - 1)).toBe(level);
    }
  });

  it("never goes down as XP grows", () => {
    let previous = 0;
    for (let xp = 0; xp < 5000; xp += 7) {
      const level = calculateLevelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });
});

describe("getLevelProgress", () => {
  it("reports how far into the current level a member is", () => {
    expect(getLevelProgress(120)).toEqual({ level: 1, xpIntoLevel: 20, xpForThisLevel: 155 });
  });

  it("starts a fresh member at the beginning of level 0", () => {
    expect(getLevelProgress(0)).toEqual({ level: 0, xpIntoLevel: 0, xpForThisLevel: 100 });
  });
});
