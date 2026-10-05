import type {
  ChannelKind,
  DeletionKind,
  PlanChannel,
  PlanDeletion,
  PlanRole,
  ServerPlan,
} from "./plan";
import type { ServerSnapshot } from "./snapshot";

export type DiffStatus = "new" | "exists";

export interface RoleDiff {
  /** The plan's own key for the role. */
  id: string;
  name: string;
  status: DiffStatus;
}

export interface ChannelDiff {
  /** `c<categoryIndex>.<channelIndex>`. Stable for one plan, so the UI can refer to it. */
  id: string;
  name: string;
  kind: ChannelKind;
  status: DiffStatus;
}

export interface CategoryDiff {
  id: string;
  name: string;
  status: DiffStatus;
  channels: ChannelDiff[];
}

/**
 * `present`: still there, can be deleted if the person confirms. `gone`: already deleted since the plan
 * was made. `changed`: renamed since, so it may no longer be what the person looked at. `protected`:
 * Discord or Forgely needs it, so it can never be deleted here.
 */
export type DeletionStatus = "present" | "gone" | "changed" | "protected";

export interface DeletionDiff {
  /** The Discord ID of the item. Unique, so the UI can use it as the tick's identity. */
  id: string;
  kind: DeletionKind;
  name: string;
  status: DeletionStatus;
}

/** The plan compared with what the server already has. Creations are only ever added; deletions are proposals. */
export interface PlanDiff {
  roles: RoleDiff[];
  categories: CategoryDiff[];
  deletions: DeletionDiff[];
  /** How many roles, categories, and channels would be created. */
  newCount: number;
}

/** What is left to do after the user's choices. Existing things are only referenced, except confirmed deletions. */
export interface CreationPlan {
  newRoles: PlanRole[];
  /** Existing roles a private channel refers to, so the applier can look them up by name. */
  existingRoles: { key: string; name: string }[];
  categories: { name: string; isNew: boolean; channels: PlanChannel[] }[];
  /** Only items the person ticked AND that are still present, unchanged, and not protected. */
  deletions: PlanDeletion[];
}

const normalizeKey = (name: string): string => name.trim().toLowerCase();

export function categoryId(index: number): string {
  return `c${index}`;
}

export function channelId(categoryIndex: number, channelIndex: number): string {
  return `c${categoryIndex}.${channelIndex}`;
}

function diffCategory(
  category: ServerPlan["categories"][number],
  index: number,
  snapshot: ServerSnapshot,
): CategoryDiff {
  const existing = snapshot.categories.find(
    (candidate) =>
      candidate.name !== null && normalizeKey(candidate.name) === normalizeKey(category.name),
  );
  const existingChannels = new Set(
    (existing?.channels ?? []).map((channel) => normalizeKey(channel.name)),
  );
  return {
    id: categoryId(index),
    name: category.name,
    status: existing ? "exists" : "new",
    channels: category.channels.map((channel, channelIndex) => ({
      id: channelId(index, channelIndex),
      name: channel.name,
      kind: channel.kind,
      status: existingChannels.has(normalizeKey(channel.name)) ? "exists" : "new",
    })),
  };
}

function diffDeletion(deletion: PlanDeletion, snapshot: ServerSnapshot): DeletionDiff {
  const current = snapshot.items?.find((item) => item.id === deletion.id);
  const base = { id: deletion.id, kind: deletion.kind, name: deletion.name };
  if (!current) return { ...base, status: "gone" };
  if (current.isProtected) return { ...base, status: "protected" };
  const isSameName = normalizeKey(current.name) === normalizeKey(deletion.name);
  return { ...base, status: isSameName && current.kind === deletion.kind ? "present" : "changed" };
}

/** Marks everything in the plan as new or already there, by case-insensitive name. */
export function diffPlan(plan: ServerPlan, snapshot: ServerSnapshot): PlanDiff {
  const existingRoles = new Set(snapshot.roles.map(normalizeKey));
  const roles = plan.roles.map<RoleDiff>((role) => ({
    id: role.key,
    name: role.name,
    status: existingRoles.has(normalizeKey(role.name)) ? "exists" : "new",
  }));
  const categories = plan.categories.map((category, index) =>
    diffCategory(category, index, snapshot),
  );
  const created = [
    ...roles,
    ...categories,
    ...categories.flatMap((category) => category.channels),
  ].filter((entry) => entry.status === "new");
  const deletions = plan.deletions.map((deletion) => diffDeletion(deletion, snapshot));
  return { roles, categories, deletions, newCount: created.length };
}

function selectChannels(
  category: ServerPlan["categories"][number],
  categoryDiff: CategoryDiff,
  excluded: ReadonlySet<string>,
  droppedRoles: ReadonlySet<string>,
): PlanChannel[] {
  return category.channels.filter((channel, index) => {
    const entry = categoryDiff.channels[index];
    if (!entry || entry.status === "exists" || excluded.has(entry.id)) return false;
    return !channel.allowedRoleKeys.some((key) => droppedRoles.has(key));
  });
}

/**
 * Applies the user's choices: only new, ticked items are kept. A channel that needs a role the user
 * unticked is dropped too, because creating it without that role would leave it visible to the wrong people.
 * A category with nothing left to create in it is not created.
 * Deletions are the opposite: kept only when ticked (opt-in), and only while still present and unchanged.
 */
export function selectPlan(
  plan: ServerPlan,
  diff: PlanDiff,
  excludedIds: ReadonlySet<string>,
  confirmedDeleteIds: ReadonlySet<string> = new Set(),
): CreationPlan {
  const roleStatus = new Map(diff.roles.map((role) => [role.id, role.status]));
  const droppedRoles = new Set(
    diff.roles
      .filter((role) => role.status === "new" && excludedIds.has(role.id))
      .map((role) => role.id),
  );
  const usedRoleKeys = new Set<string>();
  const categories: CreationPlan["categories"] = [];

  plan.categories.forEach((category, index) => {
    const categoryDiff = diff.categories[index];
    if (!categoryDiff) return;
    const isNew = categoryDiff.status === "new";
    if (isNew && excludedIds.has(categoryDiff.id)) return;
    const channels = selectChannels(category, categoryDiff, excludedIds, droppedRoles);
    if (channels.length === 0) return;
    channels.forEach((channel) => channel.allowedRoleKeys.forEach((key) => usedRoleKeys.add(key)));
    categories.push({ name: category.name, isNew, channels });
  });

  const newRoles = plan.roles.filter(
    (role) => roleStatus.get(role.key) === "new" && !droppedRoles.has(role.key),
  );
  const existingRoles = plan.roles
    .filter((role) => roleStatus.get(role.key) === "exists" && usedRoleKeys.has(role.key))
    .map((role) => ({ key: role.key, name: role.name }));
  const deletions = plan.deletions.filter((deletion) =>
    diff.deletions.some(
      (entry) =>
        entry.id === deletion.id && entry.status === "present" && confirmedDeleteIds.has(entry.id),
    ),
  );
  return { newRoles, existingRoles, categories, deletions };
}
