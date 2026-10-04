import { describe, expect, it } from "vitest";

import { formatActionReply, formatCaseLog, formatDmNotice, formatWarningList } from "./case-format";
import type { ModCase } from "./moderation.types";

function createCase(overrides: Partial<ModCase> = {}): ModCase {
  return {
    id: "id",
    guildId: "111111111111111111",
    caseNumber: 7,
    type: "ban",
    targetId: "222222222222222222",
    moderatorId: "333333333333333333",
    reason: "spam",
    durationSeconds: null,
    createdAt: new Date("2026-10-04T12:00:00Z"),
    ...overrides,
  };
}

describe("formatCaseLog", () => {
  it("lists case number, user, moderator, and reason", () => {
    const log = formatCaseLog(createCase());
    expect(log).toContain("Case #7 · Ban");
    expect(log).toContain("User: <@222222222222222222>");
    expect(log).toContain("Moderator: <@333333333333333333>");
    expect(log).toContain("Reason: spam");
  });

  it("includes the duration for timeouts and omits the user for purges", () => {
    expect(formatCaseLog(createCase({ type: "timeout", durationSeconds: 5400 }))).toContain(
      "Duration: 1h 30m",
    );
    expect(formatCaseLog(createCase({ type: "purge", targetId: null }))).not.toContain("User:");
  });
});

describe("formatDmNotice", () => {
  it("names the server, action, and reason", () => {
    expect(formatDmNotice(createCase({ type: "kick" }), "Forge")).toBe(
      "You were kicked in **Forge**.\nReason: spam",
    );
  });

  it("includes the timeout length", () => {
    const notice = formatDmNotice(createCase({ type: "timeout", durationSeconds: 3600 }), "Forge");
    expect(notice).toContain("timed out for 1h in **Forge**");
  });
});

describe("formatActionReply", () => {
  it("mentions an unreachable DM only when it failed", () => {
    expect(formatActionReply(createCase(), "sent")).not.toContain("DM");
    expect(formatActionReply(createCase(), "disabled")).not.toContain("DM");
    expect(formatActionReply(createCase(), "failed")).toContain("could not be reached by DM");
  });
});

describe("formatWarningList", () => {
  it("says so when there are no warnings", () => {
    expect(formatWarningList("1", [])).toBe("<@1> has no warnings.");
  });

  it("lists warnings with a Discord timestamp", () => {
    const text = formatWarningList("222222222222222222", [createCase({ type: "warn" })]);
    expect(text).toContain("**#7**");
    expect(text).toContain(`<t:${Math.floor(Date.parse("2026-10-04T12:00:00Z") / 1000)}:d>`);
  });
});
