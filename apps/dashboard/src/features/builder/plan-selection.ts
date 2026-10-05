import type { PlanDiff } from "@forgely/ai";

/** IDs of everything the plan would create. Items that already exist have nothing to tick. */
export function listCreatableIds(diff: PlanDiff): string[] {
  const isNew = (entry: { status: string }): boolean => entry.status === "new";
  return [
    ...diff.roles.filter(isNew).map((role) => role.id),
    ...diff.categories.filter(isNew).map((category) => category.id),
    ...diff.categories.flatMap((category) => category.channels.filter(isNew).map((c) => c.id)),
  ];
}

/** IDs of the proposed deletions that can still be ticked: present and unchanged, never protected. */
export function listDeletableIds(diff: PlanDiff): string[] {
  return diff.deletions.filter((entry) => entry.status === "present").map((entry) => entry.id);
}

/** True when nothing creatable is unticked. Vacuously true when there is nothing to create. */
export function areAllCreatableSelected(diff: PlanDiff, excluded: ReadonlySet<string>): boolean {
  return listCreatableIds(diff).every((id) => !excluded.has(id));
}

/** True when there is something deletable and all of it is ticked. */
export function areAllDeletableSelected(diff: PlanDiff, deleteIds: ReadonlySet<string>): boolean {
  const ids = listDeletableIds(diff);
  return ids.length > 0 && ids.every((id) => deleteIds.has(id));
}

/** IDs of the channels whose access the plan proposes to change. All of them can be ticked. */
export function listAccessIds(diff: PlanDiff): string[] {
  return diff.accessChanges.map((change) => change.id);
}

/** True when there is something to change and all of it is ticked. */
export function areAllAccessSelected(diff: PlanDiff, accessIds: ReadonlySet<string>): boolean {
  const ids = listAccessIds(diff);
  return ids.length > 0 && ids.every((id) => accessIds.has(id));
}
