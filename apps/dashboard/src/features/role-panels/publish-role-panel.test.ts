import { describe, expect, it, vi } from "vitest";

import type { SaveModuleSettingsInput } from "@forgely/db";
import { rolePanelsModuleConfig, type RolePanel } from "@forgely/shared";

import { buildPanelMessage } from "./build-panel-message";
import { publishRolePanel, type PublishDependencies } from "./publish-role-panel";

import { DiscordRestError, type DiscordRest } from "@/lib/discord-rest";

const GUILD = "869020525853311026";
const ACTOR = "345934416490528778";
const CHANNEL = "100000000000000001";
const OTHER_CHANNEL = "100000000000000002";
const OLD_MESSAGE = "300000000000000001";
const NEW_MESSAGE = "300000000000000002";
const PANEL_ID = "abcd1234";

function panel(patch: Partial<RolePanel> = {}): RolePanel {
  return {
    id: PANEL_ID,
    title: "Pick",
    description: "Press a button.",
    channelId: CHANNEL,
    message: null,
    mode: "toggle",
    buttons: [{ roleId: "200000000000000001", label: "Gamer", style: "primary" }],
    ...patch,
  };
}

function setup(
  options: { panels?: RolePanel[]; stored?: boolean; discord?: Partial<DiscordRest> } = {},
) {
  const discord = {
    postMessage: vi.fn(async () => ({ id: NEW_MESSAGE })),
    editMessage: vi.fn(async (): Promise<"edited" | "missing"> => "edited"),
    ...options.discord,
  };
  const stored =
    options.stored === false
      ? undefined
      : { isEnabled: true, configVersion: 1, config: { panels: options.panels ?? [panel()] } };
  const deps = {
    findStored: vi.fn(async () => stored),
    saveWithAudit: vi.fn(async (_input: SaveModuleSettingsInput) => undefined),
    discord,
  } satisfies PublishDependencies;
  const publish = (panelId = PANEL_ID) =>
    publishRolePanel(deps, { guildId: GUILD, panelId, actorId: ACTOR });
  return { deps, discord, publish };
}

describe("posting a panel for the first time", () => {
  it("posts the built message to the panel's channel", async () => {
    const { discord, publish } = setup();

    await publish();

    expect(discord.postMessage).toHaveBeenCalledWith(CHANNEL, buildPanelMessage(panel()));
    expect(discord.editMessage).not.toHaveBeenCalled();
  });

  it("writes the new message id back, so the next click edits instead of posting again", async () => {
    const { deps, publish } = setup();

    const result = await publish();

    expect(result).toMatchObject({ ok: true, posted: "created" });
    expect(deps.saveWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: GUILD,
        moduleId: "role-panels",
        actorId: ACTOR,
        isEnabled: true,
        configVersion: rolePanelsModuleConfig.version,
        config: {
          panels: [
            expect.objectContaining({ message: { channelId: CHANNEL, messageId: NEW_MESSAGE } }),
          ],
        },
      }),
    );
  });

  it("returns the new saved config so the form can refresh without a reload", async () => {
    const { publish } = setup();

    const result = await publish();

    expect(result.ok && result.config.panels[0]?.message).toEqual({
      channelId: CHANNEL,
      messageId: NEW_MESSAGE,
    });
  });

  it("leaves the other panels exactly as they were", async () => {
    const other = panel({ id: "efgh5678", title: "Other" });
    const { deps, publish } = setup({ panels: [panel(), other] });

    await publish();

    const saved = vi.mocked(deps.saveWithAudit).mock.calls[0]?.[0];
    expect((saved?.config as { panels: RolePanel[] }).panels[1]).toEqual(other);
  });
});

describe("updating a panel that is already posted", () => {
  const posted = panel({ message: { channelId: CHANNEL, messageId: OLD_MESSAGE } });

  it("edits the existing message and writes nothing", async () => {
    const { deps, discord, publish } = setup({ panels: [posted] });

    const result = await publish();

    expect(result).toMatchObject({ ok: true, posted: "updated" });
    expect(discord.editMessage).toHaveBeenCalledWith(
      CHANNEL,
      OLD_MESSAGE,
      buildPanelMessage(posted),
    );
    expect(discord.postMessage).not.toHaveBeenCalled();
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });

  it("posts a new message when the old one was deleted in Discord", async () => {
    const { deps, discord, publish } = setup({
      panels: [posted],
      discord: { editMessage: vi.fn(async () => "missing" as const) },
    });

    const result = await publish();

    expect(result).toMatchObject({ ok: true, posted: "created" });
    expect(discord.postMessage).toHaveBeenCalled();
    expect(deps.saveWithAudit).toHaveBeenCalled();
  });

  it("posts fresh, instead of editing, when the panel moved to another channel", async () => {
    const moved = panel({
      channelId: OTHER_CHANNEL,
      message: { channelId: CHANNEL, messageId: OLD_MESSAGE },
    });
    const { discord, publish } = setup({ panels: [moved] });

    await publish();

    expect(discord.editMessage).not.toHaveBeenCalled();
    expect(discord.postMessage).toHaveBeenCalledWith(OTHER_CHANNEL, expect.anything());
  });
});

describe("refusing to post", () => {
  it("needs the panel to be saved first", async () => {
    const { discord, publish } = setup({ stored: false });

    expect(await publish()).toEqual({ ok: false, message: "Save this panel first, then post it." });
    expect(discord.postMessage).not.toHaveBeenCalled();
  });

  it("refuses an id that is not in the saved config", async () => {
    const { discord, publish } = setup();

    expect(await publish("zzzz9999")).toMatchObject({ ok: false });
    expect(discord.postMessage).not.toHaveBeenCalled();
  });

  it("needs a channel", async () => {
    const { discord, publish } = setup({ panels: [panel({ channelId: null })] });

    expect(await publish()).toMatchObject({
      ok: false,
      message: expect.stringContaining("Choose a channel"),
    });
    expect(discord.postMessage).not.toHaveBeenCalled();
  });

  it("needs at least one button", async () => {
    const { discord, publish } = setup({ panels: [panel({ buttons: [] })] });

    expect(await publish()).toMatchObject({
      ok: false,
      message: expect.stringContaining("at least one button"),
    });
    expect(discord.postMessage).not.toHaveBeenCalled();
  });

  it("does not crash on stored data that no longer matches the schema", async () => {
    const { deps, publish } = setup();
    deps.findStored.mockResolvedValue({
      isEnabled: true,
      configVersion: 1,
      config: { garbage: true },
    } as never);

    expect(await publish()).toMatchObject({ ok: false });
  });
});

describe("when Discord says no", () => {
  const refuse = (status: number) => ({
    postMessage: vi.fn(async () => {
      throw new DiscordRestError(status, undefined, "nope");
    }),
  });

  it("explains a missing-permission refusal in terms of what to grant", async () => {
    const { deps, publish } = setup({ discord: refuse(403) });

    const result = await publish();

    expect(result).toMatchObject({
      ok: false,
      message: expect.stringContaining("View Channel, Send Messages, and Embed Links"),
    });
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });

  it("explains a deleted channel", async () => {
    const { publish } = setup({ discord: refuse(404) });

    expect(await publish()).toMatchObject({
      ok: false,
      message: expect.stringContaining("doesn't exist any more"),
    });
  });

  it("gives a generic retry message for anything else, and saves nothing", async () => {
    const { deps, publish } = setup({ discord: refuse(500) });

    expect(await publish()).toMatchObject({
      ok: false,
      message: expect.stringContaining("Try again"),
    });
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });
});
