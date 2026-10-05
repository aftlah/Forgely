import { describe, expect, it, vi } from "vitest";

import { diffPlan, selectPlan } from "./diff-plan";
import { generatePlan, resolveDeletions } from "./generate-plan";
import { modelPlanSchema, serverPlanSchema, type ServerPlan } from "./plan";
import type { AiProvider } from "./provider";
import type { ExistingItem, ServerSnapshot } from "./snapshot";

const ID = {
  rules: "100000000000000001",
  chat: "100000000000000002",
  old: "100000000000000003",
  admin: "100000000000000004",
};

const ITEMS: ExistingItem[] = [
  {
    ref: "h1",
    kind: "channel",
    id: ID.rules,
    name: "rules",
    parentName: "Info",
    isProtected: true,
  },
  { ref: "h2", kind: "channel", id: ID.chat, name: "chat", parentName: "Club", isProtected: false },
  { ref: "k1", kind: "category", id: ID.old, name: "Old", parentName: null, isProtected: false },
  { ref: "r1", kind: "role", id: ID.admin, name: "Admin", parentName: null, isProtected: true },
];

const SNAPSHOT: ServerSnapshot = { roles: ["Admin"], categories: [], items: ITEMS };

const removeOnly = (deletions: ServerPlan["deletions"]): ServerPlan => ({
  summary: "Tidy up",
  roles: [],
  categories: [],
  deletions,
});

describe("plans that only remove things", () => {
  it("is valid when it deletes something, and rejected when it does nothing at all", () => {
    const deletion = { kind: "channel" as const, id: ID.chat, name: "chat" };
    expect(serverPlanSchema.safeParse(removeOnly([deletion])).success).toBe(true);
    expect(serverPlanSchema.safeParse(removeOnly([])).success).toBe(false);
  });

  it("the model schema accepts a missing deleteRefs and rejects an invented ref shape", () => {
    const base = { summary: "x", roles: [], categories: [] };
    expect(modelPlanSchema.safeParse({ ...base, deleteRefs: ["h2"] }).success).toBe(true);
    expect(modelPlanSchema.safeParse({ ...base, deleteRefs: ["100000000000000002"] }).success).toBe(
      false,
    );
    expect(modelPlanSchema.safeParse({ ...base, deleteRefs: ["#general"] }).success).toBe(false);
  });
});

describe("resolveDeletions", () => {
  it("maps refs to real items", () => {
    expect(resolveDeletions(["h2", "k1"], ITEMS)).toEqual([
      { kind: "channel", id: ID.chat, name: "chat" },
      { kind: "category", id: ID.old, name: "Old" },
    ]);
  });

  it("drops protected items, unknown refs, and repeats", () => {
    expect(resolveDeletions(["h1", "r1", "h99", "h2", "h2"], ITEMS)).toEqual([
      { kind: "channel", id: ID.chat, name: "chat" },
    ]);
  });

  it("deletes nothing when the server has no item list", () => {
    expect(resolveDeletions(["h2"], undefined)).toEqual([]);
  });
});

describe("generatePlan with deletions", () => {
  it("resolves the model's refs and never leaks IDs into the prompt", async () => {
    const answer = JSON.stringify({
      summary: "Remove chat",
      roles: [],
      categories: [],
      deleteRefs: ["h2", "h1"],
    });
    const generateJson = vi.fn(async () => ({ text: answer, model: "m" }));
    const provider: AiProvider = { generateJson };

    const result = await generatePlan({
      provider,
      description: "remove the chat channel",
      snapshot: SNAPSHOT,
    });

    expect(result.plan.deletions).toEqual([{ kind: "channel", id: ID.chat, name: "chat" }]);
    const prompt = (generateJson.mock.calls[0] as unknown as [{ user: string }])[0].user;
    expect(prompt).toContain('h2: channel "chat" in "Club"');
    expect(prompt).not.toContain(ID.chat);
    // Protected items are not offered, so the model cannot even name them.
    expect(prompt).not.toContain("h1:");
    expect(prompt).not.toContain("r1:");
  });
});

describe("diff and selection of deletions", () => {
  const plan = removeOnly([
    { kind: "channel", id: ID.chat, name: "chat" },
    { kind: "category", id: ID.old, name: "Old" },
  ]);

  it("marks each deletion present, gone, changed, or protected against the server as it is now", () => {
    const now: ServerSnapshot = {
      ...SNAPSHOT,
      items: [
        { ...ITEMS[1]!, name: "renamed" },
        { ...ITEMS[2]!, isProtected: true },
      ],
    };
    expect(diffPlan(plan, SNAPSHOT).deletions.map((d) => d.status)).toEqual(["present", "present"]);
    expect(diffPlan(plan, now).deletions.map((d) => d.status)).toEqual(["changed", "protected"]);
    expect(diffPlan(plan, { roles: [], categories: [] }).deletions.map((d) => d.status)).toEqual([
      "gone",
      "gone",
    ]);
  });

  it("deletes nothing unless the person ticked it", () => {
    const diff = diffPlan(plan, SNAPSHOT);
    expect(selectPlan(plan, diff, new Set()).deletions).toEqual([]);
    expect(selectPlan(plan, diff, new Set(), new Set([ID.chat])).deletions).toEqual([
      { kind: "channel", id: ID.chat, name: "chat" },
    ]);
  });

  it("refuses a ticked deletion that is no longer present, unchanged, and unprotected", () => {
    const gone = diffPlan(plan, { roles: [], categories: [], items: [] });
    expect(selectPlan(plan, gone, new Set(), new Set([ID.chat, ID.old])).deletions).toEqual([]);
  });

  it("ignores ticks for things that were never in the plan", () => {
    const diff = diffPlan(plan, SNAPSHOT);
    expect(selectPlan(plan, diff, new Set(), new Set([ID.rules, ID.admin])).deletions).toEqual([]);
  });
});
