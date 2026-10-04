import { configUpdatedMessageSchema, REDIS_CHANNELS } from "@forgely/shared";

import type { Logger } from "../core/logger";

import type { GuildConfigService } from "./guild-config-service";

/** The slice of an ioredis connection the subscriber uses, so tests can fake it. */
export interface MessageSubscriber {
  subscribe: (channel: string) => Promise<unknown>;
  on: (event: "message", listener: (channel: string, message: string) => void) => unknown;
}

interface Dependencies {
  subscriber: MessageSubscriber;
  guildConfig: GuildConfigService;
  logger: Logger;
}

/**
 * Listens for config changes published by the dashboard and invalidates the cache,
 * so the next command or event reads fresh settings without a restart.
 */
export async function startConfigSubscriber({
  subscriber,
  guildConfig,
  logger,
}: Dependencies): Promise<void> {
  subscriber.on("message", (channel, rawMessage) => {
    if (channel !== REDIS_CHANNELS.configUpdated) return;
    void handleMessage(rawMessage);
  });

  async function handleMessage(rawMessage: string): Promise<void> {
    try {
      const message = configUpdatedMessageSchema.parse(JSON.parse(rawMessage));
      await guildConfig.invalidate(message.guildId, message.moduleId);
      logger.debug(
        { guildId: message.guildId, module: message.moduleId },
        "Config cache invalidated",
      );
    } catch (error) {
      logger.warn({ err: error, rawMessage }, "Ignored invalid config-updated message");
    }
  }

  await subscriber.subscribe(REDIS_CHANNELS.configUpdated);
}
