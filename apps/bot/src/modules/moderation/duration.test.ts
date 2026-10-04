import { describe, expect, it } from "vitest";

import { ValidationError } from "@forgely/shared";

import { formatDuration, MAX_TIMEOUT_MS, parseTimeoutDuration } from "./duration";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("parseTimeoutDuration", () => {
  it("parses single units", () => {
    expect(parseTimeoutDuration("30m")).toBe(30 * MINUTE);
    expect(parseTimeoutDuration("2h")).toBe(2 * HOUR);
    expect(parseTimeoutDuration("7d")).toBe(7 * DAY);
    expect(parseTimeoutDuration("1w")).toBe(7 * DAY);
  });

  it("parses combined units, ignoring case and spaces", () => {
    expect(parseTimeoutDuration("1h 30M")).toBe(90 * MINUTE);
  });

  it("accepts exactly the 28 day maximum", () => {
    expect(parseTimeoutDuration("28d")).toBe(MAX_TIMEOUT_MS);
  });

  it.each(["", "abc", "10", "m5", "-5m", "1.5h", "5x"])("rejects %j as malformed", (input) => {
    expect(() => parseTimeoutDuration(input)).toThrow(ValidationError);
  });

  it("rejects durations outside Discord's range", () => {
    expect(() => parseTimeoutDuration("30s")).toThrow(ValidationError);
    expect(() => parseTimeoutDuration("29d")).toThrow(ValidationError);
  });
});

describe("formatDuration", () => {
  it("formats mixed durations", () => {
    expect(formatDuration(90 * MINUTE)).toBe("1h 30m");
    expect(formatDuration(2 * DAY + 3 * HOUR)).toBe("2d 3h");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});
