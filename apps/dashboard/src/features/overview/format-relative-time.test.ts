import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./format-relative-time";

const NOW = new Date("2026-10-05T12:00:00Z");
const ago = (milliseconds: number): Date => new Date(NOW.getTime() - milliseconds);

describe("formatRelativeTime", () => {
  it("says just now for the last minute", () => {
    expect(formatRelativeTime(ago(0), NOW)).toBe("just now");
    expect(formatRelativeTime(ago(59_000), NOW)).toBe("just now");
  });

  it("counts minutes, hours, and days, with the right plural", () => {
    expect(formatRelativeTime(ago(60_000), NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(ago(5 * 60_000), NOW)).toBe("5 minutes ago");
    expect(formatRelativeTime(ago(3_600_000), NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(ago(3 * 3_600_000), NOW)).toBe("3 hours ago");
    expect(formatRelativeTime(ago(86_400_000), NOW)).toBe("1 day ago");
    expect(formatRelativeTime(ago(12 * 86_400_000), NOW)).toBe("12 days ago");
  });

  it("never claims the future", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 5 * 60_000), NOW)).toBe("just now");
  });
});
