import { describe, expect, it, vi } from "vitest";

import { ticketsModuleConfig, welcomeModuleConfig } from "@forgely/shared";

import type { GuildResources } from "./guild-resources";
import { saveModuleSettings, type SaveDependencies } from "./save-module-settings";

const GUILD = "869020525853311026";
const ACTOR = "345934416490528778";
const CHANNEL = "100000000000000001";
const OTHER_GUILDS_CHANNEL = "100000000000000999";
const ASSIGNABLE_ROLE = "200000000000000001";
const ROLE_ABOVE_BOT = "200000000000000002";

const CATEGORY = "300000000000000001";

const resources: GuildResources = {
  channels: [{ id: CHANNEL, name: "welcome" }],
  categories: [{ id: CATEGORY, name: "Support" }],
  roles: [
    {
      id: ASSIGNABLE_ROLE,
      name: "Member",
      color: null,
      isAssignable: true,
      unavailableReason: null,
    },
    {
      id: ROLE_ABOVE_BOT,
      name: "Mod",
      color: null,
      isAssignable: false,
      unavailableReason: "above-bot",
    },
  ],
};

function setup(overrides: Partial<SaveDependencies> = {}) {
  const deps = {
    findStored: vi.fn(async () => undefined),
    saveWithAudit: vi.fn(async () => undefined),
    loadResources: vi.fn(async () => resources as GuildResources | null),
    publish: vi.fn(async () => "instant" as const),
    ...overrides,
  } satisfies SaveDependencies;
  return deps;
}

function welcomeConfig(patch: Record<string, unknown> = {}) {
  return { ...welcomeModuleConfig.defaults, ...patch };
}

const request = (config: unknown, extra: Record<string, unknown> = {}) => ({
  guildId: GUILD,
  moduleId: "welcome",
  actorId: ACTOR,
  isEnabled: true,
  config,
  ...extra,
});

describe("saveModuleSettings: validation", () => {
  it("rejects a module that has no settings, without touching anything", async () => {
    const deps = setup();

    const result = await saveModuleSettings(deps, request(welcomeConfig(), { moduleId: "system" }));

    expect(result).toMatchObject({ ok: false, reason: "unknown-module" });
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });

  it("rejects a module id that is an inherited object key", async () => {
    const result = await saveModuleSettings(
      setup(),
      request(welcomeConfig(), { moduleId: "constructor" }),
    );
    expect(result).toMatchObject({ ok: false, reason: "unknown-module" });
  });

  it("requires isEnabled to be a real boolean", async () => {
    const result = await saveModuleSettings(
      setup(),
      request(welcomeConfig(), { isEnabled: "yes" }),
    );
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("returns field errors keyed by path when the schema fails", async () => {
    const config = welcomeConfig({ welcome: { channelId: null, message: "" } });

    const result = await saveModuleSettings(setup(), request(config));

    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(result.ok ? {} : result.fieldErrors).toHaveProperty(["welcome.message"]);
  });

  it("rejects more auto-roles than the schema allows", async () => {
    const tooMany = Array.from({ length: 11 }, (_, index) =>
      `20000000000000010${index}`.slice(0, 18),
    );
    const result = await saveModuleSettings(
      setup(),
      request(welcomeConfig({ autoRoleIds: tooMany })),
    );
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });
});

describe("saveModuleSettings: references to the server", () => {
  it("rejects a channel that is not in this server (for example one from another server)", async () => {
    const deps = setup();
    const config = welcomeConfig({ welcome: { channelId: OTHER_GUILDS_CHANNEL, message: "Hi" } });

    const result = await saveModuleSettings(deps, request(config));

    expect(result).toMatchObject({ ok: false, reason: "unknown-reference" });
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });

  it("rejects a role that does not exist in this server", async () => {
    const result = await saveModuleSettings(
      setup(),
      request(welcomeConfig({ autoRoleIds: ["200000000000000777"] })),
    );
    expect(result).toMatchObject({ ok: false, reason: "unknown-reference" });
  });

  it("rejects a role the bot cannot assign, naming it", async () => {
    const result = await saveModuleSettings(
      setup(),
      request(welcomeConfig({ autoRoleIds: [ROLE_ABOVE_BOT] })),
    );

    expect(result).toMatchObject({ ok: false, reason: "unknown-reference" });
    expect(result.ok ? "" : result.message).toContain("Mod");
  });

  it("still allows an unassignable role that was already saved, so other edits are not blocked", async () => {
    const stored = {
      isEnabled: true,
      configVersion: 1,
      config: welcomeConfig({ autoRoleIds: [ROLE_ABOVE_BOT] }),
    };
    const deps = setup({ findStored: vi.fn(async () => stored) });

    const result = await saveModuleSettings(
      deps,
      request(welcomeConfig({ autoRoleIds: [ROLE_ABOVE_BOT] })),
    );

    expect(result.ok).toBe(true);
  });
});

describe("saveModuleSettings: when Discord cannot be reached", () => {
  it("accepts settings that only repeat what is already saved", async () => {
    const stored = {
      isEnabled: true,
      configVersion: 1,
      config: welcomeConfig({ welcome: { channelId: CHANNEL, message: "Hi" } }),
    };
    const deps = setup({
      loadResources: vi.fn(async () => null),
      findStored: vi.fn(async () => stored),
    });

    const result = await saveModuleSettings(
      deps,
      request(welcomeConfig({ welcome: { channelId: CHANNEL, message: "New text" } })),
    );

    expect(result.ok).toBe(true);
  });

  it("refuses a newly chosen channel it cannot verify", async () => {
    const deps = setup({ loadResources: vi.fn(async () => null) });

    const result = await saveModuleSettings(
      deps,
      request(welcomeConfig({ welcome: { channelId: CHANNEL, message: "Hi" } })),
    );

    expect(result).toMatchObject({ ok: false, reason: "unverifiable" });
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });

  it("allows saving with no channels or roles chosen", async () => {
    const deps = setup({ loadResources: vi.fn(async () => null) });
    expect((await saveModuleSettings(deps, request(welcomeConfig()))).ok).toBe(true);
  });
});

describe("saveModuleSettings: storing and notifying", () => {
  it("stores the parsed config with the actor and schema version, then publishes", async () => {
    const deps = setup();
    const config = welcomeConfig({
      welcome: { channelId: CHANNEL, message: "Hi {user}" },
      autoRoleIds: [ASSIGNABLE_ROLE],
    });

    const result = await saveModuleSettings(deps, request(config));

    expect(result).toEqual({ ok: true, delivery: "instant" });
    expect(deps.saveWithAudit).toHaveBeenCalledWith({
      guildId: GUILD,
      moduleId: "welcome",
      actorId: ACTOR,
      isEnabled: true,
      configVersion: welcomeModuleConfig.version,
      config: expect.objectContaining({ autoRoleIds: [ASSIGNABLE_ROLE] }),
    });
    expect(deps.publish).toHaveBeenCalledWith(GUILD, "welcome");
  });

  it("drops unknown keys sent by the browser", async () => {
    const deps = setup();

    await saveModuleSettings(deps, request({ ...welcomeConfig(), injected: "<script>" }));

    const saved = vi.mocked(deps.saveWithAudit).mock.calls[0]?.[0];
    expect(saved?.config).not.toHaveProperty("injected");
  });

  it("passes the delivery mode through so the UI can be honest about timing", async () => {
    const deps = setup({ publish: vi.fn(async () => "delayed" as const) });

    expect(await saveModuleSettings(deps, request(welcomeConfig()))).toEqual({
      ok: true,
      delivery: "delayed",
    });
  });

  it("does not hide a database failure", async () => {
    const deps = setup({
      saveWithAudit: vi.fn(async () => {
        throw new Error("db down");
      }),
    });

    await expect(saveModuleSettings(deps, request(welcomeConfig()))).rejects.toThrow("db down");
    expect(deps.publish).not.toHaveBeenCalled();
  });
});

describe("saveModuleSettings: tickets", () => {
  const ticketsRequest = (patch: Record<string, unknown>) => ({
    guildId: GUILD,
    moduleId: "tickets",
    actorId: ACTOR,
    isEnabled: true,
    config: { ...ticketsModuleConfig.defaults, ...patch },
  });

  it("accepts a real category, and a support role the bot cannot hand out", async () => {
    const deps = setup();
    const result = await saveModuleSettings(
      deps,
      ticketsRequest({ categoryId: CATEGORY, supportRoleIds: [ROLE_ABOVE_BOT] }),
    );
    expect(result).toMatchObject({ ok: true });
    expect(deps.saveWithAudit).toHaveBeenCalledTimes(1);
  });

  it("rejects a category that is not in this server", async () => {
    const deps = setup();
    const result = await saveModuleSettings(
      deps,
      ticketsRequest({ categoryId: "300000000000000999" }),
    );
    expect(result).toMatchObject({ ok: false, reason: "unknown-reference" });
    expect(deps.saveWithAudit).not.toHaveBeenCalled();
  });

  it("rejects a text channel used where a category is needed", async () => {
    const result = await saveModuleSettings(setup(), ticketsRequest({ categoryId: CHANNEL }));
    expect(result).toMatchObject({ ok: false, reason: "unknown-reference" });
  });

  it("rejects a support role that does not exist", async () => {
    const result = await saveModuleSettings(
      setup(),
      ticketsRequest({ supportRoleIds: ["200000000000000777"] }),
    );
    expect(result).toMatchObject({ ok: false, reason: "unknown-reference" });
  });

  it("refuses a newly chosen category it cannot verify when Discord is unreachable", async () => {
    const deps = setup({ loadResources: vi.fn(async () => null) });
    const result = await saveModuleSettings(deps, ticketsRequest({ categoryId: CATEGORY }));
    expect(result).toMatchObject({ ok: false, reason: "unverifiable" });
  });
});
