import { renderTemplate, type LevelingConfig } from "@forgely/shared";

import type { Logger } from "../../core/logger";

import type { LevelingRepository } from "./leveling.repository";
import { calculateLevelFromXp } from "./xp-math";

/** What the service can do in Discord. The adapter implements it; tests fake it. */
export interface LevelingPort {
  /** `channelId` null means "the channel the member just wrote in". */
  announceLevelUp: (content: string, channelId: string | null) => Promise<void>;
  grantRoles: (roleIds: string[]) => Promise<void>;
}

export interface MessageInput {
  guildId: string;
  userId: string;
  username: string;
  guildName: string;
  config: LevelingConfig;
  port: LevelingPort;
  logger: Logger;
}

export type MessageOutcome =
  { awarded: false } | { awarded: true; level: number; leveledUp: boolean };

interface Dependencies {
  repository: LevelingRepository;
  /** Returns a number in [0, 1). Injected so tests are deterministic. */
  random?: () => number;
}

/** A whole number between `min` and `max`, both included. */
function pickBetween(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** One failing step (a deleted channel, a missing permission) must not stop the others. */
async function attempt(logger: Logger, step: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    logger.warn({ err: error, step }, "Leveling step failed");
  }
}

export function createLevelingService({ repository, random = Math.random }: Dependencies) {
  async function celebrate(input: MessageInput, level: number): Promise<void> {
    const { config, port, logger, userId, username, guildName } = input;
    const { mode, channelId, message } = config.levelUp;

    if (mode !== "off") {
      const content = renderTemplate(message, {
        user: `<@${userId}>`,
        username,
        level: String(level),
        server: guildName,
      });
      await attempt(logger, "level-up-message", () =>
        port.announceLevelUp(content, mode === "channel" ? channelId : null),
      );
    }

    // Every reward at or below the new level, not only the one just crossed: a reward added later
    // is picked up at the member's next level-up instead of never.
    const roleIds = config.roleRewards
      .filter((reward) => reward.level <= level)
      .map((reward) => reward.roleId);
    if (roleIds.length > 0) await attempt(logger, "role-rewards", () => port.grantRoles(roleIds));
  }

  return {
    /** Counts one message: awards XP if the cooldown allows, and celebrates a level-up. */
    async handleMessage(input: MessageInput): Promise<MessageOutcome> {
      const { xp } = input.config;
      const gain = pickBetween(xp.min, xp.max, random);

      const award = await repository.awardXp({
        guildId: input.guildId,
        userId: input.userId,
        gain,
        cooldownSeconds: xp.cooldownSeconds,
      });
      if (!award) return { awarded: false };

      const level = calculateLevelFromXp(award.newXp);
      const leveledUp = level > calculateLevelFromXp(award.newXp - gain);
      if (!leveledUp) return { awarded: true, level, leveledUp };

      await repository.setLevel(input.guildId, input.userId, level);
      await celebrate(input, level);
      return { awarded: true, level, leveledUp };
    },
  };
}

export type LevelingService = ReturnType<typeof createLevelingService>;
