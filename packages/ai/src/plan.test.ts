import { describe, expect, it } from "vitest";

import { serverPlanSchema, type ServerPlan } from "./plan";

const channel = (patch: Partial<ServerPlan["categories"][number]["channels"][number]> = {}) => ({
  name: "general",
  kind: "text" as const,
  topic: null,
  access: "public" as const,
  allowedRoleKeys: [],
  ...patch,
});

const plan = (patch: Partial<ServerPlan> = {}): ServerPlan => ({
  summary: "A chess club",
  deletions: [],
  roles: [{ key: "member", name: "Member", color: null, isHoisted: false }],
  categories: [{ name: "Club", channels: [channel()] }],
  ...patch,
});

describe("serverPlanSchema", () => {
  it("accepts a valid plan", () => {
    expect(serverPlanSchema.safeParse(plan()).success).toBe(true);
  });

  it("rejects a private channel that names an unknown role", () => {
    const result = serverPlanSchema.safeParse(
      plan({
        categories: [
          { name: "Staff", channels: [channel({ access: "private", allowedRoleKeys: ["ghost"] })] },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a private channel with nobody allowed in", () => {
    const result = serverPlanSchema.safeParse(
      plan({ categories: [{ name: "Staff", channels: [channel({ access: "private" })] }] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects role lists on a public channel", () => {
    const result = serverPlanSchema.safeParse(
      plan({
        categories: [{ name: "Club", channels: [channel({ allowedRoleKeys: ["member"] })] }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a private channel for a role the plan creates", () => {
    const result = serverPlanSchema.safeParse(
      plan({
        categories: [
          {
            name: "Staff",
            channels: [channel({ access: "private", allowedRoleKeys: ["member"] })],
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects duplicate role keys", () => {
    const role = { key: "member", name: "Member", color: null, isHoisted: false };
    expect(
      serverPlanSchema.safeParse(plan({ roles: [role, { ...role, name: "Other" }] })).success,
    ).toBe(false);
  });

  it("rejects a bad color and an oversized plan", () => {
    const badColor = plan({ roles: [{ key: "a", name: "A", color: "red", isHoisted: false }] });
    expect(serverPlanSchema.safeParse(badColor).success).toBe(false);

    const categories = Array.from({ length: 6 }, (_, index) => ({
      name: `Category ${index}`,
      channels: Array.from({ length: 25 }, (__, number) => channel({ name: `chat-${number}` })),
    }));
    expect(serverPlanSchema.safeParse(plan({ categories })).success).toBe(false);
  });

  it("has no way to express a permission", () => {
    const withPermissions = {
      ...plan(),
      roles: [{ key: "a", name: "A", color: null, isHoisted: false, permissions: "8" }],
    };
    const parsed = serverPlanSchema.parse(withPermissions);
    expect(parsed.roles[0]).not.toHaveProperty("permissions");
  });
});
