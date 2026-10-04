import { describe, expect, it } from "vitest";

import { hasManageGuildPermission } from "./permissions";

describe("hasManageGuildPermission", () => {
  it("accepts MANAGE_GUILD", () => {
    expect(hasManageGuildPermission("32")).toBe(true);
  });

  it("accepts ADMINISTRATOR even without the MANAGE_GUILD bit", () => {
    expect(hasManageGuildPermission("8")).toBe(true);
  });

  it("rejects unrelated permissions", () => {
    expect(hasManageGuildPermission("2048")).toBe(false);
  });
});
