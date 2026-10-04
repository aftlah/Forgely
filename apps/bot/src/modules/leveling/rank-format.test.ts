import { describe, expect, it } from "vitest";

import { formatLeaderboard, formatRankCard } from "./rank-format";

describe("formatRankCard", () => {
  it("shows name, level, rank, progress, and total XP", () => {
    const card = formatRankCard({ displayName: "Ada", xp: 120, rank: 3 });

    expect(card).toContain("**Ada** · Level 1 · Rank #3");
    expect(card).toContain("20 / 155 XP to level 2");
    expect(card).toContain("(120 XP in total)");
  });

  it("starts with an empty bar and fills it as XP grows within a level", () => {
    const empty = formatRankCard({ displayName: "A", xp: 0, rank: 1 });
    const half = formatRankCard({ displayName: "A", xp: 50, rank: 1 });

    expect(empty).toContain("░░░░░░░░░░░░");
    expect(half).toContain("██████░░░░░░");
  });

  it("formats big numbers with separators", () => {
    expect(formatRankCard({ displayName: "A", xp: 1234567, rank: 1200 })).toContain("Rank #1,200");
  });
});

describe("formatLeaderboard", () => {
  const rows = [
    { userId: "111111111111111111", xp: 5432, level: 12 },
    { userId: "222222222222222222", xp: 900, level: 4 },
  ];

  it("numbers each row from the first position of the page", () => {
    const text = formatLeaderboard(rows, 2, 3, 11);

    expect(text).toContain("**11.** <@111111111111111111> · Level 12 · 5,432 XP");
    expect(text).toContain("**12.** <@222222222222222222> · Level 4 · 900 XP");
    expect(text).toContain("Page 2 of 3");
  });

  it("says so when nobody has XP yet", () => {
    expect(formatLeaderboard([], 1, 1, 1)).toBe("Nobody has earned XP here yet. Start chatting!");
  });
});
