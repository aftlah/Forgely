import { describe, expect, it, vi } from "vitest";

import type { StoredModuleConfig } from "@forgely/db";
import { ticketsModuleConfig, type TicketsConfig } from "@forgely/shared";

import { buildTicketPanelMessage } from "./build-ticket-panel-message";
import { publishTicketPanel, type PublishTicketDependencies } from "./publish-ticket-panel";

import { DiscordRestError, type DiscordRest } from "@/lib/discord-rest";

const GUILD = "869020525853311026";
const ACTOR = "345934416490528778";
const CATEGORY = "300000000000000001";
const CHANNEL = "100000000000000001";
const OLD_CHANNEL = "100000000000000002";
const MESSAGE = "500000000000000001";

const READY: TicketsConfig = {
  ...ticketsModuleConfig.defaults,
  categoryId: CATEGORY,
  panel: { ...ticketsModuleConfig.defaults.panel, channelId: CHANNEL },
};

function setup(
  config: TicketsConfig | undefined,
  discord: Partial<DiscordRest> = {},
  isEnabled = true,
) {
  const stored: StoredModuleConfig | undefined = config
    ? ({ isEnabled, config, configVersion: 1 } as unknown as StoredModuleConfig)
    : undefined;
  const deps = {
    findStored: vi.fn(async () => stored),
    saveWithAudit: vi.fn(async () => undefined),
    discord: {
      postMessage: vi.fn(async () => ({ id: MESSAGE })),
      editMessage: vi.fn(async () => "edited" as const),
      ...discord,
    },
  } satisfies PublishTicketDependencies;
  const publish = () => publishTicketPanel(deps, { guildId: GUILD, actorId: ACTOR });
  return { deps, publish };
}

describe("buildTicketPanelMessage", () => {
  it("is an embed with one open button, and can ping nobody", () => {
    const message = buildTicketPanelMessage(READY.panel);
    expect(message.embeds).toHaveLength(1);
    expect(JSON.stringify(message.components)).toContain('"custom_id":"tk:open"');
    expect(JSON.stringify(message.components)).toContain(READY.panel.buttonLabel);
    expect(message.allowed_mentions).toEqual({ parse: [] });
  });
});

describe("publishTicketPanel", () => {
  it("posts a new message and writes its ID back through the audited save", async () => {
    const { deps, publish } = setup(READY);
    const result = await publish();
    expect(result).toMatchObject({ ok: true, posted: "created" });
    expect(deps.discord.postMessage).toHaveBeenCalledWith(CHANNEL, expect.any(Object));
    expect(deps.saveWithAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: GUILD,
        actorId: ACTOR,
        moduleId: "tickets",
        isEnabled: true,
        config: expect.objectContaining({
          panel: expect.objectContaining({ message: { channelId: CHANNEL, messageId: MESSAGE } }),
        }),
      }),
    );
  });

  it("edits the existing message in place and saves nothing new", async () => {
    const posted = {
      ...READY,
      panel: { ...READY.panel, message: { channelId: CHANNEL, messageId: MESSAGE } },
    };
    const { deps, publish } = setup(posted);
    expect(await publish()).toMatchObject({ ok: true, posted: "updated" });
    expect(deps.discord.editMessage).toHaveBeenCalledWith(CHANNEL, MESSAGE, expect.any(Object));
    expect(deps.discord.postMessage).not.toHaveBeenCalled();
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });

  it("posts a fresh message when the channel changed or the old one was deleted", async () => {
    const moved = {
      ...READY,
      panel: { ...READY.panel, message: { channelId: OLD_CHANNEL, messageId: MESSAGE } },
    };
    const changed = setup(moved);
    expect(await changed.publish()).toMatchObject({ ok: true, posted: "created" });
    expect(changed.deps.discord.editMessage).not.toHaveBeenCalled();

    const deleted = setup(
      { ...READY, panel: { ...READY.panel, message: { channelId: CHANNEL, messageId: MESSAGE } } },
      { editMessage: vi.fn(async () => "missing" as const) },
    );
    expect(await deleted.publish()).toMatchObject({ ok: true, posted: "created" });
  });

  it("keeps the module's on/off state when it writes the message ID back", async () => {
    const { deps, publish } = setup(READY, {}, false);
    await publish();
    expect(deps.saveWithAudit).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }));
  });

  it("refuses before anything is saved, a channel is chosen, or a category exists", async () => {
    expect(await setup(undefined).publish()).toMatchObject({ ok: false });

    const noChannel = setup({ ...READY, panel: { ...READY.panel, channelId: null } });
    expect(await noChannel.publish()).toMatchObject({
      ok: false,
      message: expect.stringContaining("channel"),
    });
    expect(noChannel.deps.discord.postMessage).not.toHaveBeenCalled();

    const noCategory = setup({ ...READY, categoryId: null });
    expect(await noCategory.publish()).toMatchObject({
      ok: false,
      message: expect.stringContaining("category"),
    });
    expect(noCategory.deps.discord.postMessage).not.toHaveBeenCalled();
  });

  it("explains a refused post and does not record a message that never existed", async () => {
    const { deps, publish } = setup(READY, {
      postMessage: vi.fn(async () => {
        throw new DiscordRestError(403, 50013, "no");
      }),
    });
    expect(await publish()).toMatchObject({
      ok: false,
      message: expect.stringContaining("Send Messages"),
    });
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });
});
