import { getLevelProgress } from "./xp-math";

const BAR_LENGTH = 12;
const FILLED = "█";
const EMPTY = "░";

function format(value: number): string {
  return value.toLocaleString("en-US");
}

function renderBar(fraction: number): string {
  const filled = Math.min(BAR_LENGTH, Math.floor(fraction * BAR_LENGTH));
  return FILLED.repeat(filled) + EMPTY.repeat(BAR_LENGTH - filled);
}

interface RankCardInput {
  displayName: string;
  xp: number;
  rank: number;
}

/** The reply to /rank: name, level, rank, a progress bar, and the XP numbers. */
export function formatRankCard({ displayName, xp, rank }: RankCardInput): string {
  const { level, xpIntoLevel, xpForThisLevel } = getLevelProgress(xp);
  const bar = renderBar(xpIntoLevel / xpForThisLevel);
  return [
    `**${displayName}** · Level ${level} · Rank #${format(rank)}`,
    `${bar} ${format(xpIntoLevel)} / ${format(xpForThisLevel)} XP to level ${level + 1} (${format(xp)} XP in total)`,
  ].join("\n");
}

interface LeaderboardRow {
  userId: string;
  xp: number;
  level: number;
}

/** The reply to /leaderboard. `firstPosition` is the rank of the first row on this page. */
export function formatLeaderboard(
  rows: LeaderboardRow[],
  page: number,
  totalPages: number,
  firstPosition: number,
): string {
  if (rows.length === 0) return "Nobody has earned XP here yet. Start chatting!";

  const lines = rows.map(
    (row, index) =>
      `**${firstPosition + index}.** <@${row.userId}> · Level ${row.level} · ${format(row.xp)} XP`,
  );
  return [...lines, "", `Page ${page} of ${totalPages}`].join("\n");
}
