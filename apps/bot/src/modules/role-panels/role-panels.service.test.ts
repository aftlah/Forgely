import { describe, expect, it, vi } from "vitest";

import type { RolePanel, RolePanelsConfig } from "@forgely/shared";

import { createSilentLogger } from "../../testing/silent-logger";

import { handleRolePanelClick, type RolePanelPort } from "./role-panels.service";

const PANEL_ID = "abcd1234";
const GAMER = "200000000000000001";
const ARTIST = "200000000000000002";
const OTHER = "200000000000000099";

function panel(patch: Partial<RolePanel> = {}): RolePanel {
  return {
    id: PANEL_ID,
    title: "Pick",
    description: "",
    channelId: null,
    message: null,
    mode: "toggle",
    buttons: [
      { roleId: GAMER, label: "Gamer", style: "primary" },
      { roleId: ARTIST, label: "Artist", style: "secondary" },
    ],
    ...patch,
  };
}

function click(
  options: { panels?: RolePanel[]; roleId?: string; has?: string[]; panelId?: string } = {},
) {
  const port = {
    addRoles: vi.fn<RolePanelPort["addRoles"]>(async () => undefined),
    removeRoles: vi.fn<RolePanelPort["removeRoles"]>(async () => undefined),
  };
  const config: RolePanelsConfig = { panels: options.panels ?? [panel()] };
  const run = () =>
    handleRolePanelClick({
      config,
      panelId: options.panelId ?? PANEL_ID,
      roleId: options.roleId ?? GAMER,
      memberRoleIds: new Set(options.has ?? []),
      port,
      logger: createSilentLogger(),
    });
  return { port, run };
}

describe("toggle panels", () => {
  it("adds a role the member does not have", async () => {
    const { port, run } = click();

    expect(await run()).toBe(`Added <@&${GAMER}>.`);
    expect(port.addRoles).toHaveBeenCalledWith([GAMER]);
    expect(port.removeRoles).not.toHaveBeenCalled();
  });

  it("removes a role the member already has", async () => {
    const { port, run } = click({ has: [GAMER] });

    expect(await run()).toBe(`Removed <@&${GAMER}>.`);
    expect(port.removeRoles).toHaveBeenCalledWith([GAMER]);
    expect(port.addRoles).not.toHaveBeenCalled();
  });

  it("leaves the member's other roles alone", async () => {
    const { port, run } = click({ has: [ARTIST] });

    await run();

    expect(port.removeRoles).not.toHaveBeenCalled();
    expect(port.addRoles).toHaveBeenCalledWith([GAMER]);
  });
});

describe("unique panels", () => {
  const unique = panel({ mode: "unique" });

  it("swaps the member's other panel roles for the one they picked", async () => {
    const { port, run } = click({ panels: [unique], has: [ARTIST, OTHER] });

    const reply = await run();

    expect(port.removeRoles).toHaveBeenCalledWith([ARTIST]);
    expect(port.addRoles).toHaveBeenCalledWith([GAMER]);
    expect(reply).toBe(`Added <@&${GAMER}> (removed <@&${ARTIST}>).`);
  });

  it("never touches roles that are not part of the panel", async () => {
    const { port, run } = click({ panels: [unique], has: [OTHER] });

    await run();

    expect(port.removeRoles).not.toHaveBeenCalled();
  });

  it("lets the member drop their choice by clicking it again", async () => {
    const { port, run } = click({ panels: [unique], has: [GAMER] });

    expect(await run()).toBe(`Removed <@&${GAMER}>.`);
    expect(port.addRoles).not.toHaveBeenCalled();
  });
});

describe("stale or forged buttons", () => {
  it("does nothing when the panel no longer exists", async () => {
    const { port, run } = click({ panels: [] });

    expect(await run()).toMatch(/changed or removed/);
    expect(port.addRoles).not.toHaveBeenCalled();
  });

  it("does nothing when the panel id is not the saved one", async () => {
    const { port, run } = click({ panelId: "zzzz9999" });

    expect(await run()).toMatch(/changed or removed/);
    expect(port.addRoles).not.toHaveBeenCalled();
  });

  it("refuses a role that is not one of the panel's buttons (a forged button)", async () => {
    const { port, run } = click({ roleId: OTHER });

    expect(await run()).toMatch(/changed or removed/);
    expect(port.addRoles).not.toHaveBeenCalled();
    expect(port.removeRoles).not.toHaveBeenCalled();
  });
});

describe("when Discord refuses", () => {
  it("explains how to fix a role the bot cannot manage, instead of throwing", async () => {
    const { port, run } = click();
    port.addRoles.mockRejectedValue(new Error("Missing Permissions"));

    expect(await run()).toMatch(/move the Forgely role above it/);
  });

  it("explains it when removing fails too", async () => {
    const { port, run } = click({ has: [GAMER] });
    port.removeRoles.mockRejectedValue(new Error("Missing Permissions"));

    expect(await run()).toMatch(/move the Forgely role above it/);
  });
});
