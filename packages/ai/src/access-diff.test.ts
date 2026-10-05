import { describe, expect, it } from "vitest";

import { diffAccessChanges, effectiveAccess } from "./access-diff";
import { diffPlan, selectPlan } from "./diff-plan";
import type { ChannelAccess, ChannelKind, ServerPlan } from "./plan";
import type { ExistingItem, ServerSnapshot } from "./snapshot";

const STAFF = "200000000000000001";
const FOUNDER = "200000000000000002";
const CHANNEL = "300000000000000001";

const role = (ref: string, id: string, name: string): ExistingItem => ({
  ref,
  kind: "role",
  id,
  name,
  parentName: null,
  isProtected: false,
});

const channel = (
  id: string,
  name: string,
  category: string,
  access: ExistingItem["access"],
  isProtected = false,
): ExistingItem => ({
  ref: "h1",
  kind: "channel",
  id,
  name,
  parentName: category,
  isProtected,
  access,
});

function snapshotWith(...items: ExistingItem[]): ServerSnapshot {
  // Like a real snapshot, the plain role names match the role items.
  const roles = items.filter((item) => item.kind === "role").map((item) => item.name);
  return { roles, categories: [], items };
}

function planWith(
  access: ChannelAccess,
  allowedRoleKeys: string[] = [],
  kind: ChannelKind = "text",
): ServerPlan {
  return {
    summary: "x",
    deletions: [],
    roles: [
      { key: "staff", name: "Staff", color: null, isHoisted: false },
      { key: "founder", name: "The Founder", color: null, isHoisted: false },
    ],
    categories: [
      {
        name: "Headquarter",
        channels: [{ name: "announcement", kind, topic: null, access, allowedRoleKeys }],
      },
    ],
  };
}

const ROLES = [role("r1", STAFF, "Staff"), role("r2", FOUNDER, "The Founder")];
const OPEN = { access: "public" as const, viewRoleIds: [] };

describe("effectiveAccess", () => {
  it("treats read-only voice as public, since a voice channel cannot be read-only", () => {
    expect(effectiveAccess("voice", "read-only")).toBe("public");
    expect(effectiveAccess("text", "read-only")).toBe("read-only");
  });
});

describe("diffAccessChanges", () => {
  it("proposes making a public channel private for the listed roles", () => {
    const snapshot = snapshotWith(...ROLES, channel(CHANNEL, "announcement", "Headquarter", OPEN));
    const changes = diffAccessChanges(planWith("private", ["staff", "founder"]), snapshot);
    expect(changes).toEqual([
      {
        id: CHANNEL,
        name: "announcement",
        categoryName: "Headquarter",
        kind: "text",
        from: "public",
        to: "private",
        roleKeys: ["staff", "founder"],
        roleNames: ["Staff", "The Founder"],
      },
    ]);
  });

  it("says nothing when the channel already matches, so a re-run is quiet", () => {
    const current = { access: "private" as const, viewRoleIds: [FOUNDER, STAFF] };
    const snapshot = snapshotWith(
      ...ROLES,
      channel(CHANNEL, "announcement", "Headquarter", current),
    );
    expect(diffAccessChanges(planWith("private", ["staff", "founder"]), snapshot)).toEqual([]);
    expect(
      diffAccessChanges(
        planWith("public"),
        snapshotWith(...ROLES, channel(CHANNEL, "announcement", "Headquarter", OPEN)),
      ),
    ).toEqual([]);
  });

  it("proposes a change when a private channel has a different set of roles", () => {
    const current = { access: "private" as const, viewRoleIds: [STAFF] };
    const snapshot = snapshotWith(
      ...ROLES,
      channel(CHANNEL, "announcement", "Headquarter", current),
    );
    expect(diffAccessChanges(planWith("private", ["staff", "founder"]), snapshot)).toHaveLength(1);
  });

  it("proposes a change to a role that does not exist yet, since it cannot match", () => {
    const current = { access: "private" as const, viewRoleIds: [STAFF] };
    const snapshot = snapshotWith(
      role("r1", STAFF, "Staff"),
      channel(CHANNEL, "announcement", "Headquarter", current),
    );
    expect(diffAccessChanges(planWith("private", ["staff", "founder"]), snapshot)).toHaveLength(1);
  });

  it("matches the category and the channel name case-insensitively", () => {
    const snapshot = snapshotWith(...ROLES, channel(CHANNEL, "Announcement", "HEADQUARTER", OPEN));
    expect(diffAccessChanges(planWith("read-only"), snapshot)[0]).toMatchObject({
      from: "public",
      to: "read-only",
    });
  });

  it("never offers a protected channel, a channel it cannot read access for, or one that is not in the plan", () => {
    const protectedOne = snapshotWith(
      ...ROLES,
      channel(CHANNEL, "announcement", "Headquarter", OPEN, true),
    );
    expect(diffAccessChanges(planWith("private", ["staff"]), protectedOne)).toEqual([]);

    const unknown = snapshotWith(
      ...ROLES,
      channel(CHANNEL, "announcement", "Headquarter", undefined),
    );
    expect(diffAccessChanges(planWith("private", ["staff"]), unknown)).toEqual([]);

    const elsewhere = snapshotWith(
      ...ROLES,
      channel(CHANNEL, "announcement", "Other category", OPEN),
    );
    expect(diffAccessChanges(planWith("private", ["staff"]), elsewhere)).toEqual([]);
  });

  it("does not turn a read-only voice channel into a phantom change", () => {
    const snapshot = snapshotWith(...ROLES, channel(CHANNEL, "announcement", "Headquarter", OPEN));
    expect(diffAccessChanges(planWith("read-only", [], "voice"), snapshot)).toEqual([]);
  });
});

describe("access changes are opt-in", () => {
  const snapshot = snapshotWith(...ROLES, channel(CHANNEL, "announcement", "Headquarter", OPEN));
  const plan = planWith("private", ["staff", "founder"]);
  const diff = diffPlan(plan, snapshot);

  it("lists them in the diff but applies none unless ticked", () => {
    expect(diff.accessChanges).toHaveLength(1);
    expect(selectPlan(plan, diff, new Set()).accessChanges).toEqual([]);
    expect(
      selectPlan(plan, diff, new Set(), new Set(), new Set([CHANNEL])).accessChanges,
    ).toHaveLength(1);
  });

  it("ignores a tick for a channel that has no proposed change", () => {
    expect(
      selectPlan(plan, diff, new Set(), new Set(), new Set(["999999999999999999"])).accessChanges,
    ).toEqual([]);
  });

  it("asks the applier to look up the roles a ticked change needs", () => {
    const selected = selectPlan(plan, diff, new Set(), new Set(), new Set([CHANNEL]));
    expect(selected.existingRoles.map((entry) => entry.key).sort()).toEqual(["founder", "staff"]);
  });

  it("drops a private change that would leave nobody able to see the channel", () => {
    const onlyOne = planWith("private", ["staff"]);
    const oneDiff = diffPlan(onlyOne, snapshot);
    // The role is new on this server, and the person unticked it.
    const noRoles = snapshotWith(channel(CHANNEL, "announcement", "Headquarter", OPEN));
    const newRoleDiff = diffPlan(onlyOne, noRoles);
    const selected = selectPlan(
      onlyOne,
      newRoleDiff,
      new Set(["staff"]),
      new Set(),
      new Set([CHANNEL]),
    );
    expect(selected.accessChanges).toEqual([]);
    expect(oneDiff.accessChanges).toHaveLength(1);
  });
});
