import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from "./constants";

const plural = (count: number, unit: string): string => `${count} ${unit}${count === 1 ? "" : "s"}`;

/**
 * "just now", "5 minutes ago", "3 hours ago", "2 days ago". Takes `now` so it is testable, and never
 * says a time is in the future: a clock that is slightly off reads as "just now".
 */
export function formatRelativeTime(date: Date, now: Date): string {
  const elapsed = Math.max(0, now.getTime() - date.getTime());
  if (elapsed < MS_PER_MINUTE) return "just now";
  if (elapsed < MS_PER_HOUR) return `${plural(Math.floor(elapsed / MS_PER_MINUTE), "minute")} ago`;
  if (elapsed < MS_PER_DAY) return `${plural(Math.floor(elapsed / MS_PER_HOUR), "hour")} ago`;
  return `${plural(Math.floor(elapsed / MS_PER_DAY), "day")} ago`;
}
