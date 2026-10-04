/**
 * Sample plans for the landing-page simulation. The real AI builder (Phase 4) produces plans with
 * the same shape: groups of channel/role changes, each marked added, changed, or removed.
 */
export type PlanOp = "+" | "~" | "-";

export type PlanItem =
  { kind: "group"; name: string } | { kind: "change"; op: PlanOp; name: string; detail?: string };

export interface Plan {
  id: string;
  title: string;
  prompt: string;
  items: PlanItem[];
}

export type PresetKey = "gaming" | "study" | "studio";

const group = (name: string): PlanItem => ({ kind: "group", name });
const add = (name: string, detail?: string): PlanItem => ({
  kind: "change",
  op: "+",
  name,
  detail,
});
const rename = (name: string): PlanItem => ({ kind: "change", op: "~", name, detail: "renamed" });
/** Removals are never applied by default; the user has to tick them. */
const removal = (name: string): PlanItem => ({
  kind: "change",
  op: "-",
  name,
  detail: "not selected",
});

export const PRESETS: Record<PresetKey, Plan> = {
  gaming: {
    id: "plan-001",
    title: "plan-001 · gaming-community",
    prompt: "Build me a gaming community with ranked roles and tryout channels",
    items: [
      group("Information"),
      add("#rules", "locked"),
      add("#announcements", "locked"),
      add("#tryout-schedule", "locked"),
      group("Community"),
      rename("#general → #lobby"),
      add("#clips"),
      add("#looking-for-team"),
      group("Ranked"),
      add("@Diamond", "role"),
      add("@Platinum", "role"),
      add("@Gold", "role"),
      add("#ranked-chat", "role-gated"),
      add("Ranked Voice", "voice"),
      group("Tryouts"),
      add("#tryout-signup"),
      add("Tryout Voice", "voice"),
      removal("#random"),
    ],
  },
  study: {
    id: "plan-002",
    title: "plan-002 · study-group",
    prompt:
      "A study group for beginner programmers with mentors, weekly Q&A, and a channel per language",
    items: [
      group("Start here"),
      add("#welcome", "locked"),
      add("#rules", "locked"),
      add("#introductions"),
      group("Learning"),
      rename("#general → #help"),
      add("#python"),
      add("#javascript"),
      add("#weekly-qa"),
      add("Study Together", "voice"),
      group("Mentors"),
      add("@Mentor", "role"),
      add("#mentor-room", "role-gated"),
      removal("#random"),
    ],
  },
  studio: {
    id: "plan-003",
    title: "plan-003 · indie-studio",
    prompt:
      "An indie game studio with 12 people plus a player community, internal dev channels and public feedback",
    items: [
      group("Public"),
      add("#announcements", "locked"),
      add("#devlog", "locked"),
      rename("#general → #chat"),
      group("Feedback"),
      add("#bug-reports"),
      add("#feature-requests"),
      add("#playtest-signup"),
      group("Internal"),
      add("@Dev", "role"),
      add("#standup", "role-gated"),
      add("#build-status", "role-gated"),
      add("Dev Meeting", "voice"),
      removal("#random"),
    ],
  },
};

export const PRESET_LABELS: Record<PresetKey, string> = {
  gaming: "Gaming clan",
  study: "Study group",
  studio: "Indie studio",
};

const KEYWORDS: Array<[PresetKey, RegExp]> = [
  ["study", /study|learn|mentor|course|class/],
  ["studio", /studio|indie|dev|release|playtest/],
];

/** Picks the sample plan that best matches the text. Falls back to the gaming plan. */
export function pickPlan(text: string): Plan {
  const exact = Object.values(PRESETS).find((plan) => plan.prompt === text);
  if (exact) return exact;

  const lower = text.toLowerCase();
  const match = KEYWORDS.find(([, pattern]) => pattern.test(lower));
  return PRESETS[match ? match[0] : "gaming"];
}

export interface PlanSummary {
  added: number;
  changed: number;
  removed: number;
}

type ChangeItem = Extract<PlanItem, { kind: "change" }>;

export function getChanges(plan: Plan): ChangeItem[] {
  return plan.items.filter((item): item is ChangeItem => item.kind === "change");
}

/** Counts what applying the plan would do, given which removals the user ticked. */
export function summarizePlan(plan: Plan, selectedRemovals: ReadonlySet<string>): PlanSummary {
  const changes = getChanges(plan);
  return {
    added: changes.filter((item) => item.op === "+").length,
    changed: changes.filter((item) => item.op === "~").length,
    removed: changes.filter((item) => item.op === "-" && selectedRemovals.has(item.name)).length,
  };
}

/** The changes that would actually be applied: everything except unticked removals. */
export function getApplySteps(plan: Plan, selectedRemovals: ReadonlySet<string>): ChangeItem[] {
  return getChanges(plan).filter((item) => item.op !== "-" || selectedRemovals.has(item.name));
}
