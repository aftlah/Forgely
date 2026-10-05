import { describe, expect, it } from "vitest";

import type { CreationPlan, PlanChannel } from "@forgely/ai";

import { describeSummary, summarizeCreation, summarizeDeletions } from "./creation-summary";

const channel: PlanChannel = {
  name: "x",
  kind: "text",
  topic: null,
  access: "public",
  allowedRoleKeys: [],
};

const CREATION: CreationPlan = {
  newRoles: [{ key: "a", name: "A", color: null, isHoisted: false }],
  existingRoles: [],
  categories: [
    { name: "New", isNew: true, channels: [channel, channel] },
    { name: "Old", isNew: false, channels: [channel] },
  ],
  accessChanges: [],
  deletions: [
    { kind: "channel", id: "100000000000000001", name: "old-chat" },
    { kind: "channel", id: "100000000000000002", name: "old-news" },
    { kind: "category", id: "100000000000000003", name: "Old" },
  ],
};

describe("summarizeCreation", () => {
  it("counts new roles, new categories, and every channel to create", () => {
    expect(summarizeCreation(CREATION)).toEqual({ roles: 1, categories: 1, channels: 3, total: 5 });
  });
});

describe("summarizeDeletions", () => {
  it("counts the ticked deletions by kind", () => {
    expect(summarizeDeletions(CREATION)).toEqual({
      roles: 0,
      categories: 1,
      channels: 2,
      total: 3,
    });
  });
});

describe("describeSummary", () => {
  it("reads like a sentence", () => {
    expect(describeSummary({ roles: 2, categories: 1, channels: 9, total: 12 })).toBe(
      "2 roles, 1 category and 9 channels",
    );
  });

  it("handles one part, two parts, and nothing", () => {
    expect(describeSummary({ roles: 0, categories: 0, channels: 1, total: 1 })).toBe("1 channel");
    expect(describeSummary({ roles: 0, categories: 2, channels: 5, total: 7 })).toBe(
      "2 categories and 5 channels",
    );
    expect(describeSummary({ roles: 0, categories: 0, channels: 0, total: 0 })).toBe("nothing");
  });
});
