import { ValidationError } from "@forgely/shared";

export const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const MAX_TIMEOUT_DAYS = 28;

const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE;
const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;

export const SECONDS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

const MS_PER_UNIT = {
  s: MS_PER_SECOND,
  m: MS_PER_MINUTE,
  h: MS_PER_HOUR,
  d: MS_PER_DAY,
  w: DAYS_PER_WEEK * MS_PER_DAY,
} as const;

type DurationUnit = keyof typeof MS_PER_UNIT;

/** Discord rejects timeouts longer than 28 days. */
export const MAX_TIMEOUT_MS = MAX_TIMEOUT_DAYS * MS_PER_DAY;
export const MIN_TIMEOUT_MS = MS_PER_MINUTE;

const WHOLE_DURATION_PATTERN = /^(?:\d+[smhdw])+$/i;
const DURATION_PART_PATTERN = /(\d+)([smhdw])/gi;

const DURATION_HELP = "Use a duration like 30m, 2h, 7d, or 1h30m (1 minute to 28 days).";

/** Parses text such as "90m" or "1h30m" into milliseconds, enforcing Discord's timeout limits. */
export function parseTimeoutDuration(input: string): number {
  const text = input.trim().replaceAll(/\s+/g, "");
  if (!WHOLE_DURATION_PATTERN.test(text)) {
    throw new ValidationError(`Unparseable duration: "${input}"`, DURATION_HELP);
  }

  let totalMs = 0;
  for (const [, amount, unit] of text.matchAll(DURATION_PART_PATTERN)) {
    totalMs += Number(amount) * MS_PER_UNIT[(unit ?? "s").toLowerCase() as DurationUnit];
  }

  if (totalMs < MIN_TIMEOUT_MS || totalMs > MAX_TIMEOUT_MS) {
    throw new ValidationError(`Duration out of range: ${totalMs} ms`, DURATION_HELP);
  }
  return totalMs;
}

/** Formats milliseconds for humans, for example 5400000 becomes "1h 30m". */
export function formatDuration(durationMs: number): string {
  const parts: string[] = [];
  let remaining = durationMs;
  for (const unit of ["d", "h", "m", "s"] as const) {
    const amount = Math.floor(remaining / MS_PER_UNIT[unit]);
    remaining -= amount * MS_PER_UNIT[unit];
    if (amount > 0) parts.push(`${amount}${unit}`);
  }
  return parts.join(" ") || "0s";
}
