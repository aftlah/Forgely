import type { Interaction } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { defineModuleConfig } from "@forgely/shared";

import { createSilentLogger } from "../testing/silent-logger";

import { createCommandRouter } from "./command-router";
import { defineButton, defineCommand, defineModule } from "./define";
import { createModuleRegistry } from "./module-registry";
import type { AppContext } from "./types";

vi.mock("@sentry/node", () => ({ captureException: vi.fn() }));

const GUILD_ID = "111111111111111111";

function setup({ isModuleEnabled }: { isModuleEnabled: boolean }) {
  const execute = vi.fn(async () => undefined);
  const command = defineCommand({
    data: { name: "greet", toJSON: () => ({ name: "greet", description: "x" }) },
    execute,
  });
  const gatedModule = defineModule({
    id: "greeter",
    commands: [command],
    events: [],
    config: defineModuleConfig({
      moduleId: "greeter",
      version: 1,
      schema: z.object({}),
      defaults: {},
    }),
  });
  const alwaysOnModule = defineModule({
    id: "system",
    commands: [
      defineCommand({
        data: { name: "ping", toJSON: () => ({ name: "ping", description: "x" }) },
        execute,
      }),
    ],
    events: [],
  });

  // The service method is generic over the config schema; the mock returns an empty config.
  const getModuleState = vi.fn(async () => ({ isEnabled: isModuleEnabled, config: {} }));
  const app: AppContext = {
    logger: createSilentLogger(),
    guildConfig: {
      getModuleState: getModuleState as unknown as AppContext["guildConfig"]["getModuleState"],
      invalidate: vi.fn(),
    },
    db: {} as AppContext["db"],
    guildRepository: { markGuildJoined: vi.fn(), markGuildLeft: vi.fn() },
  };

  const route = createCommandRouter(createModuleRegistry([gatedModule, alwaysOnModule]), app);
  return { route, execute, getModuleState };
}

function createInteraction(commandName: string, guildId: string | null = GUILD_ID) {
  const reply = vi.fn(async () => undefined);
  const interaction = {
    isChatInputCommand: () => true,
    commandName,
    guildId,
    user: { id: "222222222222222222" },
    replied: false,
    deferred: false,
    reply,
  };
  return { interaction: interaction as unknown as Interaction, reply };
}

describe("createCommandRouter", () => {
  it("runs a command whose module is enabled", async () => {
    const { route, execute } = setup({ isModuleEnabled: true });
    const { interaction } = createInteraction("greet");

    await route(interaction);

    expect(execute).toHaveBeenCalledOnce();
  });

  it("refuses a command whose module is disabled and tells the user", async () => {
    const { route, execute } = setup({ isModuleEnabled: false });
    const { interaction, reply } = createInteraction("greet");

    await route(interaction);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "That feature is turned off on this server." }),
    );
  });

  it("refuses a gated module's command used outside a guild", async () => {
    const { route, execute } = setup({ isModuleEnabled: true });
    const { interaction } = createInteraction("greet", null);

    await route(interaction);

    expect(execute).not.toHaveBeenCalled();
  });

  it("always runs commands from modules without config", async () => {
    const { route, execute, getModuleState } = setup({ isModuleEnabled: false });
    const { interaction } = createInteraction("ping", null);

    await route(interaction);

    expect(execute).toHaveBeenCalledOnce();
    expect(getModuleState).not.toHaveBeenCalled();
  });

  it("replies with a friendly message for unknown commands", async () => {
    const { route } = setup({ isModuleEnabled: true });
    const { interaction, reply } = createInteraction("nope");

    await route(interaction);

    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "I don't know that command." }),
    );
  });

  it("ignores interactions that are neither slash commands nor buttons", async () => {
    const { route, execute } = setup({ isModuleEnabled: true });

    await route({
      isChatInputCommand: () => false,
      isButton: () => false,
    } as unknown as Interaction);

    expect(execute).not.toHaveBeenCalled();
  });
});

describe("createCommandRouter: buttons", () => {
  function setupButtons({ isModuleEnabled }: { isModuleEnabled: boolean }) {
    const execute = vi.fn(async () => undefined);
    const module = defineModule({
      id: "panels",
      commands: [],
      events: [],
      buttons: [defineButton({ prefix: "rp", execute })],
      config: defineModuleConfig({
        moduleId: "panels",
        version: 1,
        schema: z.object({}),
        defaults: {},
      }),
    });
    const getModuleState = vi.fn(async () => ({ isEnabled: isModuleEnabled, config: {} }));
    const app: AppContext = {
      logger: createSilentLogger(),
      guildConfig: {
        getModuleState: getModuleState as unknown as AppContext["guildConfig"]["getModuleState"],
        invalidate: vi.fn(),
      },
      db: {} as AppContext["db"],
      guildRepository: { markGuildJoined: vi.fn(), markGuildLeft: vi.fn() },
    };
    return { route: createCommandRouter(createModuleRegistry([module]), app), execute };
  }

  function createButtonClick(customId: string) {
    const reply = vi.fn(async () => undefined);
    const interaction = {
      isChatInputCommand: () => false,
      isButton: () => true,
      customId,
      guildId: GUILD_ID,
      user: { id: "222222222222222222" },
      replied: false,
      deferred: false,
      reply,
    };
    return { interaction: interaction as unknown as Interaction, reply };
  }

  it("runs the handler for the prefix and passes the rest of the ID as parts", async () => {
    const { route, execute } = setupButtons({ isModuleEnabled: true });
    const { interaction } = createButtonClick("rp:abcd1234:200000000000000001");

    await route(interaction);

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ parts: ["abcd1234", "200000000000000001"] }),
    );
  });

  it("refuses a click when the module is turned off, and says so privately", async () => {
    const { route, execute } = setupButtons({ isModuleEnabled: false });
    const { interaction, reply } = createButtonClick("rp:abcd1234:200000000000000001");

    await route(interaction);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "That feature is turned off on this server." }),
    );
  });

  it("answers an unknown prefix (an old or forged button) with a friendly message", async () => {
    const { route, execute } = setupButtons({ isModuleEnabled: true });
    const { interaction, reply } = createButtonClick("zz:whatever");

    await route(interaction);

    expect(execute).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "This button doesn't work any more." }),
    );
  });

  it("handles a custom ID with no colon at all", async () => {
    const { route, reply } = (() => {
      const base = setupButtons({ isModuleEnabled: true });
      return { route: base.route, reply: createButtonClick("plain") };
    })();

    await route(reply.interaction);

    expect(reply.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "This button doesn't work any more." }),
    );
  });

  it("turns an error thrown by a handler into a safe reply", async () => {
    const execute = vi.fn(async () => {
      throw new Error("boom with secrets");
    });
    const module = defineModule({
      id: "x",
      commands: [],
      events: [],
      buttons: [defineButton({ prefix: "rp", execute })],
    });
    const app = {
      logger: createSilentLogger(),
      db: {},
      guildConfig: {},
      guildRepository: {},
    } as unknown as AppContext;
    const route = createCommandRouter(createModuleRegistry([module]), app);
    const { interaction, reply } = createButtonClick("rp:a:b");

    await route(interaction);

    const content = (reply.mock.calls[0] as unknown as [{ content: string }])[0].content;
    expect(content).not.toMatch(/secrets/);
    expect(content).toMatch(/went wrong/);
  });
});
