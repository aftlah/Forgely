import { describe, expect, it } from "vitest";

import { buildRolePanelButtonId, type RolePanel } from "@forgely/shared";

import { buildPanelMessage } from "./build-panel-message";

const PANEL_ID = "abcd1234";

function role(index: number): string {
  return `20000000000000${String(1000 + index)}`;
}

function panel(buttonCount: number, patch: Partial<RolePanel> = {}): RolePanel {
  return {
    id: PANEL_ID,
    title: "Pick your roles",
    description: "Press a button.",
    channelId: "100000000000000001",
    message: null,
    mode: "toggle",
    buttons: Array.from({ length: buttonCount }, (_, index) => ({
      roleId: role(index),
      label: `Role ${index}`,
      style: "secondary" as const,
    })),
    ...patch,
  };
}

type Row = {
  type: number;
  components: Array<{ custom_id: string; label: string; style: number; type: number }>;
};

describe("buildPanelMessage", () => {
  it("builds an embed from the title and description", () => {
    const message = buildPanelMessage(panel(1));

    expect(message.embeds).toEqual([
      { title: "Pick your roles", description: "Press a button.", color: 0xff5a1f },
    ]);
  });

  it("leaves the description out when it is empty, because Discord rejects an empty one", () => {
    const [embed] = buildPanelMessage(panel(1, { description: "" })).embeds as Array<
      Record<string, unknown>
    >;

    expect(embed).not.toHaveProperty("description");
  });

  it("gives each button the custom ID the bot expects, so the two always agree", () => {
    const rows = buildPanelMessage(panel(2)).components as Row[];

    expect(rows[0]?.components.map((button) => button.custom_id)).toEqual([
      buildRolePanelButtonId(PANEL_ID, role(0)),
      buildRolePanelButtonId(PANEL_ID, role(1)),
    ]);
  });

  it("maps the style names to Discord's codes", () => {
    const styled = panel(4);
    styled.buttons = styled.buttons.map((button, index) => ({
      ...button,
      style: (["primary", "secondary", "success", "danger"] as const)[index] ?? "primary",
    }));

    const [row] = buildPanelMessage(styled).components as Row[];

    expect(row?.components.map((button) => button.style)).toEqual([1, 2, 3, 4]);
  });

  it("lays buttons out five to a row, up to 25 in five rows", () => {
    const rows = buildPanelMessage(panel(12)).components as Row[];
    expect(rows.map((row) => row.components.length)).toEqual([5, 5, 2]);

    const full = buildPanelMessage(panel(25)).components as Row[];
    expect(full).toHaveLength(5);
  });

  it("sends no components for a panel without buttons", () => {
    expect(buildPanelMessage(panel(0)).components).toEqual([]);
  });

  it("allows no mentions, so a title or description cannot ping anyone", () => {
    expect(buildPanelMessage(panel(1, { title: "@everyone" })).allowed_mentions).toEqual({
      parse: [],
    });
  });

  it("keeps every label and custom ID within Discord's limits", () => {
    const rows = buildPanelMessage(panel(25)).components as Row[];
    for (const button of rows.flatMap((row) => row.components)) {
      expect(button.custom_id.length).toBeLessThanOrEqual(100);
      expect(button.label.length).toBeLessThanOrEqual(80);
    }
  });
});
