import { describe, expect, it, vi } from "vitest";

import { welcomeModuleConfig, type WelcomeConfig } from "@forgely/shared";

import { createSilentLogger } from "../../testing/silent-logger";

import {
  buildLeaveVariables,
  handleMemberJoin,
  handleMemberLeave,
  type MemberSnapshot,
  type WelcomeActions,
} from "./welcome.service";

const CHANNEL_ID = "333333333333333333";
const ROLE_ID = "444444444444444444";

const member: MemberSnapshot = {
  id: "555555555555555555",
  username: "ada",
  isBot: false,
  serverName: "Forge",
  memberCount: 42,
};

function createActions() {
  return {
    sendToChannel: vi.fn<WelcomeActions["sendToChannel"]>(async () => undefined),
    sendDirectMessage: vi.fn<WelcomeActions["sendDirectMessage"]>(async () => undefined),
    addRoles: vi.fn<WelcomeActions["addRoles"]>(async () => undefined),
  };
}

function createConfig(overrides: Partial<WelcomeConfig> = {}): WelcomeConfig {
  return { ...welcomeModuleConfig.defaults, ...overrides };
}

function run(handler: typeof handleMemberJoin, config: WelcomeConfig, snapshot = member) {
  const actions = createActions();
  const promise = handler({ config, member: snapshot, actions, logger: createSilentLogger() });
  return { actions, promise };
}

describe("handleMemberJoin", () => {
  it("does nothing when no channel, DM, or roles are configured", async () => {
    const { actions, promise } = run(handleMemberJoin, createConfig());
    await promise;

    expect(actions.sendToChannel).not.toHaveBeenCalled();
    expect(actions.sendDirectMessage).not.toHaveBeenCalled();
    expect(actions.addRoles).not.toHaveBeenCalled();
  });

  it("posts the rendered welcome message and pings only the new member", async () => {
    const config = createConfig({
      welcome: { channelId: CHANNEL_ID, message: "Hi {user}, #{memberCount} in {server}" },
    });
    const { actions, promise } = run(handleMemberJoin, config);
    await promise;

    expect(actions.sendToChannel).toHaveBeenCalledWith(
      CHANNEL_ID,
      "Hi <@555555555555555555>, #42 in Forge",
      member.id,
    );
  });

  it("sends the DM only when enabled", async () => {
    const config = createConfig({ dm: { isEnabled: true, message: "Welcome to {server}" } });
    const { actions, promise } = run(handleMemberJoin, config);
    await promise;

    expect(actions.sendDirectMessage).toHaveBeenCalledWith("Welcome to Forge");
  });

  it("adds auto-roles", async () => {
    const { actions, promise } = run(handleMemberJoin, createConfig({ autoRoleIds: [ROLE_ID] }));
    await promise;

    expect(actions.addRoles).toHaveBeenCalledWith([ROLE_ID]);
  });

  it("keeps going when one step fails", async () => {
    const config = createConfig({
      autoRoleIds: [ROLE_ID],
      welcome: { channelId: CHANNEL_ID, message: "Hi" },
      dm: { isEnabled: true, message: "DM" },
    });
    const actions = createActions();
    actions.addRoles.mockRejectedValue(new Error("Missing Permissions"));
    actions.sendToChannel.mockRejectedValue(new Error("Unknown Channel"));

    await handleMemberJoin({ config, member, actions, logger: createSilentLogger() });

    expect(actions.sendDirectMessage).toHaveBeenCalledWith("DM");
  });

  it("gives bots roles but no messages", async () => {
    const config = createConfig({
      autoRoleIds: [ROLE_ID],
      welcome: { channelId: CHANNEL_ID, message: "Hi" },
      dm: { isEnabled: true, message: "DM" },
    });
    const { actions, promise } = run(handleMemberJoin, config, { ...member, isBot: true });
    await promise;

    expect(actions.addRoles).toHaveBeenCalled();
    expect(actions.sendToChannel).not.toHaveBeenCalled();
    expect(actions.sendDirectMessage).not.toHaveBeenCalled();
  });
});

describe("handleMemberLeave", () => {
  it("posts the goodbye message without pinging anyone", async () => {
    const config = createConfig({
      goodbye: { channelId: CHANNEL_ID, message: "{user} left {server}" },
    });
    const { actions, promise } = run(handleMemberLeave, config);
    await promise;

    expect(actions.sendToChannel).toHaveBeenCalledWith(CHANNEL_ID, "ada left Forge");
  });

  it("does nothing without a goodbye channel", async () => {
    const { actions, promise } = run(handleMemberLeave, createConfig());
    await promise;

    expect(actions.sendToChannel).not.toHaveBeenCalled();
  });
});

describe("buildLeaveVariables", () => {
  it("uses the username instead of a mention", () => {
    expect(buildLeaveVariables(member).user).toBe("ada");
  });
});
