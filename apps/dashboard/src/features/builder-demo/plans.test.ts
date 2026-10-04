import { describe, expect, it } from "vitest";

import { getApplySteps, PRESETS, pickPlan, summarizePlan } from "./plans";

describe("pickPlan", () => {
  it("returns the exact preset for its own prompt", () => {
    expect(pickPlan(PRESETS.study.prompt)).toBe(PRESETS.study);
    expect(pickPlan(PRESETS.studio.prompt)).toBe(PRESETS.studio);
  });

  it("matches free text by keyword", () => {
    expect(pickPlan("a course for new learners").id).toBe(PRESETS.study.id);
    expect(pickPlan("our indie team shipping a release").id).toBe(PRESETS.studio.id);
  });

  it("falls back to the gaming plan", () => {
    expect(pickPlan("something unrelated").id).toBe(PRESETS.gaming.id);
    expect(pickPlan("").id).toBe(PRESETS.gaming.id);
  });
});

describe("summarizePlan", () => {
  it("counts additions and changes, and no removals until one is selected", () => {
    const none = summarizePlan(PRESETS.gaming, new Set());
    expect(none.removed).toBe(0);
    expect(none.added).toBeGreaterThan(0);
    expect(none.changed).toBe(1);
  });

  it("counts a removal only when the user selected it", () => {
    expect(summarizePlan(PRESETS.gaming, new Set(["#random"])).removed).toBe(1);
    expect(summarizePlan(PRESETS.gaming, new Set(["#something-else"])).removed).toBe(0);
  });
});

describe("getApplySteps", () => {
  it("never includes a removal the user did not select", () => {
    const steps = getApplySteps(PRESETS.gaming, new Set());
    expect(steps.some((step) => step.op === "-")).toBe(false);
  });

  it("includes a selected removal", () => {
    const steps = getApplySteps(PRESETS.gaming, new Set(["#random"]));
    expect(steps.filter((step) => step.op === "-")).toHaveLength(1);
  });
});
