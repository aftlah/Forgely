import { describe, expect, it } from "vitest";

import {
  buildRolePanelButtonId,
  parseRolePanelButtonParts,
  rolePanelsConfigSchema,
  rolePanelsModuleConfig,
  type RolePanel,
} from "./role-panels";

const ROLE_A = "200000000000000001";
const CHANNEL = "100000000000000001";
const MESSAGE = "300000000000000001";

function panel(patch: Partial<RolePanel> = {}): RolePanel {
  return {
    id: "abcd1234",
    title: "Pick your roles",
    description: "Click a button.",
    channelId: CHANNEL,
    message: null,
    mode: "toggle",
    buttons: [{ roleId: ROLE_A, label: "Gamer", style: "primary" }],
    ...patch,
  };
}

function paths(input: unknown): string[] {
  const result = rolePanelsConfigSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("rolePanelsConfigSchema", () => {
  it("accepts the defaults and a typical panel", () => {
    expect(rolePanelsConfigSchema.safeParse(rolePanelsModuleConfig.defaults).success).toBe(true);
    expect(rolePanelsConfigSchema.safeParse({ panels: [panel()] }).success).toBe(true);
  });

  it("allows a draft panel with no buttons and no channel yet", () => {
    expect(
      rolePanelsConfigSchema.safeParse({ panels: [panel({ buttons: [], channelId: null })] })
        .success,
    ).toBe(true);
  });

  it("accepts a panel that has been posted", () => {
    const posted = panel({ message: { channelId: CHANNEL, messageId: MESSAGE } });
    expect(rolePanelsConfigSchema.safeParse({ panels: [posted] }).success).toBe(true);
  });

  it("rejects an empty title with a readable message", () => {
    const result = rolePanelsConfigSchema.safeParse({ panels: [panel({ title: "" })] });
    expect(result.success ? "" : result.error.issues[0]?.message).toBe("Give the panel a title.");
  });

  it("rejects the same role twice in one panel, pointing at the buttons", () => {
    const buttons = [
      { roleId: ROLE_A, label: "A", style: "primary" as const },
      { roleId: ROLE_A, label: "B", style: "secondary" as const },
    ];
    expect(paths({ panels: [panel({ buttons })] })).toContain("panels.0.buttons");
  });

  it("allows the same role in two different panels", () => {
    const second = panel({ id: "efgh5678" });
    expect(rolePanelsConfigSchema.safeParse({ panels: [panel(), second] }).success).toBe(true);
  });

  it("rejects duplicate panel ids", () => {
    expect(paths({ panels: [panel(), panel()] })).toContain("panels");
  });

  it("rejects more than 25 buttons, more than 10 panels, and bad ids", () => {
    const manyButtons = Array.from({ length: 26 }, (_, index) => ({
      roleId: `20000000000000${String(1000 + index)}`,
      label: "x",
      style: "primary" as const,
    }));
    expect(
      rolePanelsConfigSchema.safeParse({ panels: [panel({ buttons: manyButtons })] }).success,
    ).toBe(false);

    const manyPanels = Array.from({ length: 11 }, (_, index) =>
      panel({ id: `panel${String(index).padStart(3, "0")}` }),
    );
    expect(rolePanelsConfigSchema.safeParse({ panels: manyPanels }).success).toBe(false);

    expect(rolePanelsConfigSchema.safeParse({ panels: [panel({ id: "BAD ID!!" })] }).success).toBe(
      false,
    );
    expect(
      rolePanelsConfigSchema.safeParse({
        panels: [panel({ buttons: [{ roleId: "nope", label: "x", style: "primary" }] })],
      }).success,
    ).toBe(false);
  });

  it("limits labels to what Discord allows", () => {
    const longLabel = [{ roleId: ROLE_A, label: "x".repeat(81), style: "primary" as const }];
    expect(
      rolePanelsConfigSchema.safeParse({ panels: [panel({ buttons: longLabel })] }).success,
    ).toBe(false);
  });
});

describe("button custom IDs", () => {
  it("round-trips a panel and role", () => {
    const id = buildRolePanelButtonId("abcd1234", ROLE_A);

    expect(id).toBe(`rp:abcd1234:${ROLE_A}`);
    expect(parseRolePanelButtonParts(id.split(":").slice(1))).toEqual({
      panelId: "abcd1234",
      roleId: ROLE_A,
    });
  });

  it("stays well under Discord's 100-character limit", () => {
    expect(buildRolePanelButtonId("abcd1234", "9".repeat(20)).length).toBeLessThan(100);
  });

  it("rejects malformed or tampered parts", () => {
    expect(parseRolePanelButtonParts([])).toBeNull();
    expect(parseRolePanelButtonParts(["abcd1234"])).toBeNull();
    expect(parseRolePanelButtonParts(["abcd1234", "not-a-role"])).toBeNull();
    expect(parseRolePanelButtonParts(["../etc", ROLE_A])).toBeNull();
    expect(parseRolePanelButtonParts(["abcd1234", ROLE_A, "extra"])).toBeNull();
  });
});
