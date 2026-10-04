import { describe, expect, it } from "vitest";

import { levelingModuleConfig, moderationModuleConfig, welcomeModuleConfig } from "@forgely/shared";

import { getConfigReferences } from "./module-references";

const CHANNEL_A = "100000000000000001";
const CHANNEL_B = "100000000000000002";
const ROLE = "200000000000000001";

describe("getConfigReferences", () => {
  it("collects the welcome and goodbye channels and the auto-roles", () => {
    const config = {
      ...welcomeModuleConfig.defaults,
      welcome: { ...welcomeModuleConfig.defaults.welcome, channelId: CHANNEL_A },
      goodbye: { ...welcomeModuleConfig.defaults.goodbye, channelId: CHANNEL_B },
      autoRoleIds: [ROLE],
    };

    expect(getConfigReferences("welcome", config)).toEqual({
      channelIds: [CHANNEL_A, CHANNEL_B],
      roleIds: [ROLE],
    });
  });

  it("skips channels that are not set", () => {
    expect(getConfigReferences("welcome", welcomeModuleConfig.defaults)).toEqual({
      channelIds: [],
      roleIds: [],
    });
  });

  it("collects the mod-log channel", () => {
    const config = { ...moderationModuleConfig.defaults, modLogChannelId: CHANNEL_A };

    expect(getConfigReferences("moderation", config)).toEqual({
      channelIds: [CHANNEL_A],
      roleIds: [],
    });
  });

  it("collects the leveling announcement channel and every role reward", () => {
    const config = {
      ...levelingModuleConfig.defaults,
      levelUp: { mode: "channel", channelId: CHANNEL_A, message: "GG" },
      roleRewards: [
        { level: 5, roleId: ROLE },
        { level: 10, roleId: "200000000000000002" },
      ],
    };

    expect(getConfigReferences("leveling", config)).toEqual({
      channelIds: [CHANNEL_A],
      roleIds: [ROLE, "200000000000000002"],
    });
  });

  it("collects every panel's channel and the roles of all their buttons, without repeats", () => {
    const button = (roleId: string) => ({ roleId, label: "x", style: "primary" as const });
    const panel = (id: string, channelId: string | null, roles: string[]) => ({
      id,
      title: "t",
      description: "",
      channelId,
      message: null,
      mode: "toggle" as const,
      buttons: roles.map(button),
    });
    const config = {
      panels: [
        panel("abcd1234", CHANNEL_A, [ROLE, "200000000000000002"]),
        panel("efgh5678", null, [ROLE]),
      ],
    };

    expect(getConfigReferences("role-panels", config)).toEqual({
      channelIds: [CHANNEL_A],
      roleIds: [ROLE, "200000000000000002"],
    });
  });

  it("returns nothing for data that does not match the schema, instead of throwing", () => {
    expect(getConfigReferences("welcome", { garbage: true })).toEqual({
      channelIds: [],
      roleIds: [],
    });
    expect(getConfigReferences("moderation", null)).toEqual({ channelIds: [], roleIds: [] });
  });
});
