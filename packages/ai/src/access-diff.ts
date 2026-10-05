import type { ChannelAccess, ChannelKind, ServerPlan } from "./plan";
import type { ExistingItem, ServerSnapshot } from "./snapshot";

/** A channel that already exists whose access (who can see it or talk in it) the plan would change. */
export interface AccessChangeDiff {
  /** The Discord ID of the channel. Unique, so the UI can use it as the tick's identity. */
  id: string;
  name: string;
  categoryName: string;
  kind: ChannelKind;
  from: ChannelAccess;
  to: ChannelAccess;
  /** The plan's role keys that may view the channel afterwards. Only used when `to` is `private`. */
  roleKeys: string[];
  /** The same roles by name, for showing the change to a person. */
  roleNames: string[];
}

const normalizeKey = (name: string): string => name.trim().toLowerCase();

/**
 * Voice channels have no read-only: creating one treats it as public. Comparing the same way means a plan
 * that says "read-only" for a voice channel never shows up as a change that cannot be made.
 */
export function effectiveAccess(kind: ChannelKind, access: ChannelAccess): ChannelAccess {
  return kind === "voice" && access === "read-only" ? "public" : access;
}

function findExistingChannel(
  snapshot: ServerSnapshot,
  categoryName: string,
  channelName: string,
): ExistingItem | undefined {
  return snapshot.items?.find(
    (item) =>
      item.kind === "channel" &&
      !item.isProtected &&
      normalizeKey(item.name) === normalizeKey(channelName) &&
      normalizeKey(item.parentName ?? "") === normalizeKey(categoryName),
  );
}

/** The role ID a plan role name stands for on this server, or null when the role does not exist yet. */
function findRoleId(snapshot: ServerSnapshot, roleName: string): string | null {
  const role = snapshot.items?.find(
    (item) => item.kind === "role" && normalizeKey(item.name) === normalizeKey(roleName),
  );
  return role?.id ?? null;
}

function isSameRoleSet(current: readonly string[], wanted: readonly (string | null)[]): boolean {
  // A role that does not exist yet (null) can never match what the channel has now.
  if (wanted.some((id) => id === null)) return false;
  return (
    current.length === wanted.length && wanted.every((id) => id !== null && current.includes(id))
  );
}

/**
 * Compares each plan channel that already exists with its current access. Only differences are returned, so a
 * channel that already matches the plan is silent. Protected channels are never offered.
 */
export function diffAccessChanges(plan: ServerPlan, snapshot: ServerSnapshot): AccessChangeDiff[] {
  const changes: AccessChangeDiff[] = [];
  const roleName = (key: string): string =>
    plan.roles.find((role) => role.key === key)?.name ?? key;

  for (const category of plan.categories) {
    for (const channel of category.channels) {
      const existing = findExistingChannel(snapshot, category.name, channel.name);
      if (!existing?.access) continue;

      const to = effectiveAccess(channel.kind, channel.access);
      const roleNames = channel.allowedRoleKeys.map(roleName);
      const wantedIds = roleNames.map((name) => findRoleId(snapshot, name));
      const isSame =
        existing.access.access === to &&
        (to !== "private" || isSameRoleSet(existing.access.viewRoleIds, wantedIds));
      if (isSame) continue;

      changes.push({
        id: existing.id,
        name: existing.name,
        categoryName: category.name,
        kind: channel.kind,
        from: existing.access.access,
        to,
        roleKeys: channel.allowedRoleKeys,
        roleNames: to === "private" ? roleNames : [],
      });
    }
  }
  return changes;
}
