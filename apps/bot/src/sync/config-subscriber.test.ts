import { describe, expect, it, vi } from "vitest";

import { REDIS_CHANNELS } from "@forgely/shared";

import { createSilentLogger } from "../testing/silent-logger";

import { startConfigSubscriber, type MessageSubscriber } from "./config-subscriber";

type MessageListener = (channel: string, message: string) => void;

function setup() {
  let listener: MessageListener = () => undefined;
  const subscriber: MessageSubscriber = {
    subscribe: vi.fn(async () => 1),
    on: (_event, callback) => {
      listener = callback;
    },
  };
  const guildConfig = { getModuleState: vi.fn(), invalidate: vi.fn(async () => undefined) };
  const started = startConfigSubscriber({ subscriber, guildConfig, logger: createSilentLogger() });
  const emit = async (channel: string, message: string): Promise<void> => {
    listener(channel, message);
    await vi.waitFor(() => undefined);
  };
  return { subscriber, guildConfig, started, emit };
}

describe("startConfigSubscriber", () => {
  it("subscribes to the config-updated channel", async () => {
    const { subscriber, started } = setup();
    await started;
    expect(subscriber.subscribe).toHaveBeenCalledWith(REDIS_CHANNELS.configUpdated);
  });

  it("invalidates the cache for a valid message", async () => {
    const { guildConfig, started, emit } = setup();
    await started;

    await emit(
      REDIS_CHANNELS.configUpdated,
      JSON.stringify({ guildId: "111111111111111111", moduleId: "welcome" }),
    );

    expect(guildConfig.invalidate).toHaveBeenCalledWith("111111111111111111", "welcome");
  });

  it("ignores malformed messages without throwing", async () => {
    const { guildConfig, started, emit } = setup();
    await started;

    await emit(REDIS_CHANNELS.configUpdated, "not json");
    await emit(REDIS_CHANNELS.configUpdated, JSON.stringify({ guildId: "abc" }));

    expect(guildConfig.invalidate).not.toHaveBeenCalled();
  });

  it("ignores messages from other channels", async () => {
    const { guildConfig, started, emit } = setup();
    await started;

    await emit(
      "some:other",
      JSON.stringify({ guildId: "111111111111111111", moduleId: "welcome" }),
    );

    expect(guildConfig.invalidate).not.toHaveBeenCalled();
  });
});
