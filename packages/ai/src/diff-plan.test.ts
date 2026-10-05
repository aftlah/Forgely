import { describe, expect, it } from "vitest";

import { diffPlan, selectPlan } from "./diff-plan";
import type { PlanChannel, ServerPlan } from "./plan";
import type { ServerSnapshot } from "./snapshot";

const channel = (name: string, patch: Partial<PlanChannel> = {}): PlanChannel => ({
  name,
  kind: "text",
  topic: null,
  access: "public",
  allowedRoleKeys: [],
  ...patch,
});

const PLAN: ServerPlan = {
  summary: "Club",
  deletions: [],
  roles: [
    { key: "member", name: "Member", color: null, isHoisted: false },
    { key: "coach", name: "Coach", color: null, isHoisted: true },
  ],
  categories: [
    { name: "Info", channels: [channel("rules"), channel("news")] },
    {
      name: "Staff",
      channels: [channel("coaches", { access: "private", allowedRoleKeys: ["coach"] })],
    },
  ],
};

const EMPTY: ServerSnapshot = { roles: [], categories: [] };
const NONE = new Set<string>();

describe("diffPlan", () => {
  it("marks everything new on an empty server", () => {
    const diff = diffPlan(PLAN, EMPTY);
    expect(diff.newCount).toBe(2 + 2 + 3);
    expect(diff.roles.every((role) => role.status === "new")).toBe(true);
  });

  it("matches existing roles, categories and channels by name, ignoring case", () => {
    const diff = diffPlan(PLAN, {
      roles: ["MEMBER"],
      categories: [{ name: "info", channels: [{ name: "Rules", kind: "text" }] }],
    });
    expect(diff.roles.map((role) => role.status)).toEqual(["exists", "new"]);
    expect(diff.categories[0]?.status).toBe("exists");
    expect(diff.categories[0]?.channels.map((entry) => entry.status)).toEqual(["exists", "new"]);
    expect(diff.newCount).toBe(4);
  });

  it("does not treat a channel outside the category as existing", () => {
    const diff = diffPlan(PLAN, {
      roles: [],
      categories: [{ name: null, channels: [{ name: "rules", kind: "text" }] }],
    });
    expect(diff.categories[0]?.channels[0]?.status).toBe("new");
  });
});

describe("selectPlan", () => {
  it("keeps everything new when nothing is unticked", () => {
    const selected = selectPlan(PLAN, diffPlan(PLAN, EMPTY), NONE);
    expect(selected.newRoles).toHaveLength(2);
    expect(selected.categories.map((category) => category.name)).toEqual(["Info", "Staff"]);
  });

  it("skips what already exists and creates new channels inside an existing category", () => {
    const snapshot: ServerSnapshot = {
      roles: ["Coach"],
      categories: [{ name: "Info", channels: [{ name: "rules", kind: "text" }] }],
    };
    const selected = selectPlan(PLAN, diffPlan(PLAN, snapshot), NONE);
    expect(selected.newRoles.map((role) => role.key)).toEqual(["member"]);
    expect(selected.existingRoles).toEqual([{ key: "coach", name: "Coach" }]);
    expect(selected.categories[0]).toMatchObject({ name: "Info", isNew: false });
    expect(selected.categories[0]?.channels.map((entry) => entry.name)).toEqual(["news"]);
  });

  it("drops an unticked channel, and a category left empty", () => {
    const diff = diffPlan(PLAN, EMPTY);
    const selected = selectPlan(PLAN, diff, new Set(["c1.0"]));
    expect(selected.categories.map((category) => category.name)).toEqual(["Info"]);
  });

  it("drops a private channel whose role was unticked rather than exposing it", () => {
    const diff = diffPlan(PLAN, EMPTY);
    const selected = selectPlan(PLAN, diff, new Set(["coach"]));
    expect(selected.newRoles.map((role) => role.key)).toEqual(["member"]);
    expect(selected.categories.map((category) => category.name)).toEqual(["Info"]);
  });

  it("drops an unticked new category with all its channels", () => {
    const selected = selectPlan(PLAN, diffPlan(PLAN, EMPTY), new Set(["c0"]));
    expect(selected.categories.map((category) => category.name)).toEqual(["Staff"]);
  });
});
