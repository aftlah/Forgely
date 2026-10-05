import { z } from "zod";

import { AiUnavailableError, ValidationError } from "@forgely/shared";

import { normalizePlan } from "./normalize";
import { modelPlanSchema, type ModelPlan, type PlanDeletion, type ServerPlan } from "./plan";
import { DESCRIPTION_LIMITS, SYSTEM_PROMPT, buildRepairPrompt, buildUserPrompt } from "./prompt";
import type { AiProvider } from "./provider";
import type { ExistingItem, ServerSnapshot } from "./snapshot";

const MAX_ATTEMPTS = 2;
const MAX_REPORTED_ISSUES = 5;

export interface GeneratePlanInput {
  provider: AiProvider;
  description: string;
  snapshot: ServerSnapshot;
  /** The plan from earlier in the same chat, when `description` asks to change it. */
  previousPlan?: ServerPlan;
  signal?: AbortSignal;
}

export interface GeneratedPlan {
  plan: ServerPlan;
  /** Which model answered, for logs. */
  model: string;
}

/** Turns a failed parse or validation into a short list the model can act on. */
function describeProblems(error: z.ZodError | SyntaxError): string {
  if (error instanceof SyntaxError) return "- The answer was not valid JSON.";
  return error.issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => `- ${issue.path.join(".") || "plan"}: ${issue.message}`)
    .join("\n");
}

function parsePlan(text: string): { plan: ModelPlan } | { problems: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { problems: describeProblems(error as SyntaxError) };
  }
  const result = modelPlanSchema.safeParse(json);
  return result.success ? { plan: result.data } : { problems: describeProblems(result.error) };
}

function checkDescription(description: string): void {
  const length = description.trim().length;
  if (length < DESCRIPTION_LIMITS.min) {
    throw new ValidationError(
      "Description too short",
      "Describe your community in a few more words.",
    );
  }
  if (length > DESCRIPTION_LIMITS.max) {
    throw new ValidationError(
      "Description too long",
      `Keep the description under ${DESCRIPTION_LIMITS.max} characters.`,
    );
  }
}

/**
 * Turns the model's refs into real items. A ref that was never offered, names a protected item, or
 * repeats is dropped silently: the model can only ever reach things we chose to show it.
 */
export function resolveDeletions(
  refs: string[],
  items: ExistingItem[] | undefined,
): PlanDeletion[] {
  const byRef = new Map((items ?? []).map((item) => [item.ref, item]));
  const resolved = new Map<string, PlanDeletion>();
  for (const ref of refs) {
    const item = byRef.get(ref);
    if (!item || item.isProtected) continue;
    resolved.set(item.id, { kind: item.kind, id: item.id, name: item.name });
  }
  return [...resolved.values()];
}

function toServerPlan(plan: ModelPlan, items: ExistingItem[] | undefined): ServerPlan {
  const { deleteRefs, ...creations } = plan;
  return { ...creations, deletions: resolveDeletions(deleteRefs, items) };
}

/**
 * Asks the model for a plan, validates it with Zod (the model's output is never trusted), and gives it
 * one chance to repair an invalid answer. The result is normalized, so names are already clean.
 */
export async function generatePlan(input: GeneratePlanInput): Promise<GeneratedPlan> {
  checkDescription(input.description);
  const jsonSchema = z.toJSONSchema(modelPlanSchema, { io: "input" });
  const basePrompt = buildUserPrompt(input.description, input.snapshot, input.previousPlan);
  let user = basePrompt;
  let lastProblems = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await input.provider.generateJson({
      system: SYSTEM_PROMPT,
      user,
      jsonSchema,
      signal: input.signal,
    });
    const parsed = parsePlan(response.text);
    if ("plan" in parsed) {
      const plan = normalizePlan(toServerPlan(parsed.plan, input.snapshot.items));
      return { plan, model: response.model };
    }
    lastProblems = parsed.problems;
    user = buildRepairPrompt(basePrompt, parsed.problems);
  }
  throw new AiUnavailableError(`The model kept returning an invalid plan:\n${lastProblems}`);
}
