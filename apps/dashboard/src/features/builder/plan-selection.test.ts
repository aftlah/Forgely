import { describe, expect, it } from "vitest";

import type { PlanDiff } from "@forgely/ai";

import {
  areAllCreatableSelected,
  areAllDeletableSelected,
  listCreatableIds,
  listDeletableIds,
} from "./plan-selection";

const DIFF: PlanDiff = {
  roles: [
    { id: "member", name: "Member", status: "new" },
    { id: "coach", name: "Coach", status: "exists" },
  ],
  categories: [
    {
      id: "c0",
      name: "Club",
      status: "new",
      channels: [
        { id: "c0.0", name: "chat", kind: "text", status: "new" },
        { id: "c0.1", name: "rules", kind: "text", status: "exists" },
      ],
    },
    {
      id: "c1",
      name: "Info",
      status: "exists",
      channels: [{ id: "c1.0", name: "news", kind: "text", status: "new" }],
    },
  ],
  accessChanges: [],
  deletions: [
    { id: "100000000000000001", kind: "channel", name: "old", status: "present" },
    { id: "100000000000000002", kind: "channel", name: "gone", status: "gone" },
    { id: "100000000000000003", kind: "role", name: "built-in", status: "protected" },
    { id: "100000000000000004", kind: "category", name: "renamed", status: "changed" },
  ],
  newCount: 4,
};

describe("listCreatableIds", () => {
  it("lists only what the plan would create", () => {
    expect(listCreatableIds(DIFF)).toEqual(["member", "c0", "c0.0", "c1.0"]);
  });
});

describe("listDeletableIds", () => {
  it("never includes gone, changed, or protected items, so select-all cannot reach them", () => {
    expect(listDeletableIds(DIFF)).toEqual(["100000000000000001"]);
  });
});

describe("select-all state", () => {
  it("knows when everything creatable is ticked", () => {
    expect(areAllCreatableSelected(DIFF, new Set())).toBe(true);
    expect(areAllCreatableSelected(DIFF, new Set(["c0.0"]))).toBe(false);
  });

  it("is true for a plan with nothing to create", () => {
    expect(areAllCreatableSelected({ ...DIFF, roles: [], categories: [] }, new Set())).toBe(true);
  });

  it("knows when every deletable item is ticked, and is false when none are deletable", () => {
    expect(areAllDeletableSelected(DIFF, new Set(["100000000000000001"]))).toBe(true);
    expect(areAllDeletableSelected(DIFF, new Set())).toBe(false);
    expect(areAllDeletableSelected({ ...DIFF, deletions: [] }, new Set())).toBe(false);
  });
});
