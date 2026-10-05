import type { CreationPlan, PlanDeletion } from "@forgely/ai";

export interface CreationSummary {
  roles: number;
  categories: number;
  channels: number;
  total: number;
}

/** What applying would create, counted the way a person thinks about it. */
export function summarizeCreation(creation: CreationPlan): CreationSummary {
  const roles = creation.newRoles.length;
  const categories = creation.categories.filter((category) => category.isNew).length;
  const channels = creation.categories.reduce((sum, category) => sum + category.channels.length, 0);
  return { roles, categories, channels, total: roles + categories + channels };
}

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "2 roles, 1 category and 9 channels", skipping the zero parts. */
export function describeSummary(summary: CreationSummary): string {
  const parts = [
    summary.roles > 0 ? plural(summary.roles, "role") : null,
    summary.categories > 0
      ? plural(summary.categories, "category").replace("categorys", "categories")
      : null,
    summary.channels > 0 ? plural(summary.channels, "channel") : null,
  ].filter((part): part is string => part !== null);
  if (parts.length <= 1) return parts[0] ?? "nothing";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** What the ticked deletions would remove, in the same shape so `describeSummary` can word it. */
export function summarizeDeletions(creation: CreationPlan): CreationSummary {
  const count = (kind: PlanDeletion["kind"]): number =>
    creation.deletions.filter((deletion) => deletion.kind === kind).length;
  const [roles, categories, channels] = [count("role"), count("category"), count("channel")];
  return { roles, categories, channels, total: roles + categories + channels };
}
