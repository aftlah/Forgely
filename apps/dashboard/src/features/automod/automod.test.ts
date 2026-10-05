import { describe, expect, it, vi } from "vitest";

import { automodModuleConfig, type AutomodConfig } from "@forgely/shared";

import { buildDesiredRules, RULE_NAMES } from "./build-rules";
import { explainAutomodError, syncAutomod } from "./sync-automod";

import type { AutomodRest } from "@/lib/discord-automod-rest";
import { DiscordRestError } from "@/lib/discord-transport";

const GUILD = "869020525853311026";
const CHANNEL = "100000000000000001";
const ROLE = "200000000000000001";

const OFF: AutomodConfig = {
  ...automodModuleConfig.defaults,
  blockSpam: false,
  mentionLimit: null,
  presets: { profanity: false, sexualContent: false, slurs: false },
};

const names = (config: AutomodConfig): string[] =>
  buildDesiredRules(config).map((rule) => rule.name);

describe("buildDesiredRules", () => {
  it("makes no rules when everything is off", () => {
    expect(buildDesiredRules(OFF)).toEqual([]);
  });

  it("makes one rule per setting that is on, under Forgely's own names", () => {
    const config: AutomodConfig = {
      ...OFF,
      blockedWords: ["badword"],
      blockInvites: true,
      blockSpam: true,
      presets: { profanity: true, sexualContent: false, slurs: true },
      mentionLimit: 8,
    };
    expect(names(config)).toEqual([
      RULE_NAMES.words,
      RULE_NAMES.invites,
      RULE_NAMES.spam,
      RULE_NAMES.language,
      RULE_NAMES.mentions,
    ]);
  });

  it("sends the words, the chosen presets, and the mention limit the way Discord expects", () => {
    const rules = buildDesiredRules({
      ...OFF,
      blockedWords: ["foo", "ba*r"],
      presets: { profanity: true, sexualContent: false, slurs: true },
      mentionLimit: 7,
    });
    const byName = new Map(rules.map((rule) => [rule.name, rule]));
    expect(byName.get(RULE_NAMES.words)?.trigger_metadata).toEqual({
      keyword_filter: ["foo", "ba*r"],
    });
    expect(byName.get(RULE_NAMES.language)?.trigger_metadata).toEqual({ presets: [1, 3] });
    expect(byName.get(RULE_NAMES.mentions)?.trigger_metadata).toEqual({ mention_total_limit: 7 });
  });

  it("always blocks, posts an alert only when a channel is set, and times out only where Discord allows it", () => {
    const config: AutomodConfig = {
      ...OFF,
      blockedWords: ["x"],
      blockSpam: true,
      alertChannelId: CHANNEL,
      timeoutSeconds: 300,
    };
    const rules = new Map(buildDesiredRules(config).map((rule) => [rule.name, rule]));
    expect(rules.get(RULE_NAMES.words)?.actions.map((a) => a.type)).toEqual([1, 2, 3]);
    // Discord does not allow a timeout on the spam rule.
    expect(rules.get(RULE_NAMES.spam)?.actions.map((a) => a.type)).toEqual([1, 2]);
    expect(
      buildDesiredRules({ ...config, alertChannelId: null, timeoutSeconds: null })[0]?.actions,
    ).toEqual([{ type: 1 }]);
  });

  it("passes the exempt roles to every rule", () => {
    const rules = buildDesiredRules({
      ...OFF,
      blockedWords: ["x"],
      blockSpam: true,
      exemptRoleIds: [ROLE],
    });
    expect(rules.every((rule) => rule.exempt_roles.includes(ROLE))).toBe(true);
  });
});

function fakeRest(existing: { id: string; name: string; enabled: boolean }[] = []) {
  return {
    listRules: vi.fn(async () => existing),
    createRule: vi.fn(async () => undefined),
    updateRule: vi.fn(async () => undefined),
    deleteRule: vi.fn(async () => undefined),
  } satisfies AutomodRest;
}

describe("syncAutomod", () => {
  const on: AutomodConfig = { ...OFF, blockedWords: ["foo"], blockSpam: true };

  it("creates the rules that are missing", async () => {
    const rest = fakeRest();
    const result = await syncAutomod({ rest }, { guildId: GUILD, isEnabled: true, config: on });
    expect(result).toEqual({ ok: true, created: 2, updated: 0, deleted: 0 });
    expect(rest.createRule).toHaveBeenCalledTimes(2);
  });

  it("updates a rule it already made instead of duplicating it", async () => {
    const rest = fakeRest([{ id: "r1", name: RULE_NAMES.words, enabled: true }]);
    const result = await syncAutomod({ rest }, { guildId: GUILD, isEnabled: true, config: on });
    expect(result).toEqual({ ok: true, created: 1, updated: 1, deleted: 0 });
    expect(rest.updateRule).toHaveBeenCalledWith(
      GUILD,
      "r1",
      expect.not.objectContaining({ trigger_type: expect.anything() }),
    );
  });

  it("removes a Forgely rule whose setting was turned off", async () => {
    const rest = fakeRest([{ id: "r2", name: RULE_NAMES.invites, enabled: true }]);
    const result = await syncAutomod({ rest }, { guildId: GUILD, isEnabled: true, config: OFF });
    expect(result).toEqual({ ok: true, created: 0, updated: 0, deleted: 1 });
  });

  it("removes every Forgely rule when the module is switched off", async () => {
    const rest = fakeRest([
      { id: "r1", name: RULE_NAMES.words, enabled: true },
      { id: "r2", name: RULE_NAMES.spam, enabled: true },
    ]);
    const result = await syncAutomod({ rest }, { guildId: GUILD, isEnabled: false, config: on });
    expect(result).toEqual({ ok: true, created: 0, updated: 0, deleted: 2 });
    expect(rest.createRule).not.toHaveBeenCalled();
  });

  it("never touches a rule the owner made by hand", async () => {
    const rest = fakeRest([{ id: "mine", name: "No links", enabled: true }]);
    await syncAutomod({ rest }, { guildId: GUILD, isEnabled: false, config: on });
    expect(rest.deleteRule).not.toHaveBeenCalled();
    expect(rest.updateRule).not.toHaveBeenCalled();
  });

  it("reports a missing permission and keeps going with the other rules", async () => {
    const rest = fakeRest();
    rest.createRule.mockRejectedValueOnce(new DiscordRestError(403, 50013, "no"));
    const result = await syncAutomod({ rest }, { guildId: GUILD, isEnabled: true, config: on });
    expect(result).toEqual({ ok: false, message: expect.stringContaining("Manage Server") });
    expect(rest.createRule).toHaveBeenCalledTimes(2);
  });

  it("explains Discord's per-type rule limit", () => {
    expect(explainAutomodError(new DiscordRestError(400, 30032, "max"))).toContain(
      "most AutoMod rules",
    );
  });

  it("fails clearly when the rules cannot be listed", async () => {
    const rest = fakeRest();
    rest.listRules.mockRejectedValueOnce(new DiscordRestError(403, 50013, "no"));
    expect(
      await syncAutomod({ rest }, { guildId: GUILD, isEnabled: true, config: on }),
    ).toMatchObject({ ok: false });
    expect(rest.createRule).not.toHaveBeenCalled();
  });
});
