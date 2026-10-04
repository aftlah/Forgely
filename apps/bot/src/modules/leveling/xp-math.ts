/**
 * The XP curve. Going from level n to n + 1 costs 5n² + 50n + 100 XP, so early levels come quickly
 * (100, 155, 220, ...) and later ones take noticeably longer. Pure functions, no Discord or database.
 */
const QUADRATIC_COST = 5;
const LINEAR_COST = 50;
const BASE_COST = 100;
/** Closed form of 0² + 1² + ... + (n-1)² is (n-1)·n·(2n-1) / 6. */
const SUM_OF_SQUARES_DIVISOR = 6;

/** XP needed to move from `level` up to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return QUADRATIC_COST * level ** 2 + LINEAR_COST * level + BASE_COST;
}

/** Total XP at which `level` begins. Level 0 starts at 0. */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  const sumOfSquares = ((level - 1) * level * (2 * level - 1)) / SUM_OF_SQUARES_DIVISOR;
  const sumOfLevels = (level * (level - 1)) / 2;
  return QUADRATIC_COST * sumOfSquares + LINEAR_COST * sumOfLevels + BASE_COST * level;
}

/** The level a member with `xp` total XP is at. */
export function calculateLevelFromXp(xp: number): number {
  let level = 0;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP earned since this level began. */
  xpIntoLevel: number;
  /** XP the whole of this level costs. */
  xpForThisLevel: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const level = calculateLevelFromXp(xp);
  return { level, xpIntoLevel: xp - xpForLevel(level), xpForThisLevel: xpToNextLevel(level) };
}
