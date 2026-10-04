import { describe, expect, it, vi } from "vitest";

import { levelingModuleConfig, type LevelingConfig } from "@forgely/shared";

import { createSilentLogger } from "../../testing/silent-logger";

import type { LevelingRepository } from "./leveling.repository";
import { createLevelingService, type LevelingPort } from "./leveling.service";
import { xpForLevel } from "./xp-math";

const GUILD = "111111111111111111";
const USER = "222222222222222222";
const CHANNEL = "333333333333333333";
const ROLE_5 = "444444444444444444";
const ROLE_10 = "555555555555555555";

function setup(options: { award?: { newXp: number } | null; random?: () => number } = {}) {
  const repository = {
    awardXp: vi.fn(async () => (options.award === undefined ? { newXp: 50 } : options.award)),
    setLevel: vi.fn(async () => undefined),
    findStanding: vi.fn(),
    findRank: vi.fn(),
    listTop: vi.fn(),
    countMembers: vi.fn(),
  } satisfies LevelingRepository;
  const port = {
    announceLevelUp: vi.fn<LevelingPort["announceLevelUp"]>(async () => undefined),
    grantRoles: vi.fn<LevelingPort["grantRoles"]>(async () => undefined),
  };
  const service = createLevelingService({ repository, random: options.random });
  const handle = (config: LevelingConfig = levelingModuleConfig.defaults) =>
    service.handleMessage({
      guildId: GUILD,
      userId: USER,
      username: "ada",
      guildName: "Forge",
      config,
      port,
      logger: createSilentLogger(),
    });
  return { repository, port, handle };
}

function configWith(patch: Partial<LevelingConfig>): LevelingConfig {
  return { ...levelingModuleConfig.defaults, ...patch };
}

describe("XP awards", () => {
  it("awards a random amount within the configured range", async () => {
    const low = setup({ random: () => 0 });
    const high = setup({ random: () => 0.999 });

    await low.handle(configWith({ xp: { min: 10, max: 20, cooldownSeconds: 60 } }));
    await high.handle(configWith({ xp: { min: 10, max: 20, cooldownSeconds: 60 } }));

    expect(low.repository.awardXp).toHaveBeenCalledWith(
      expect.objectContaining({ gain: 10, cooldownSeconds: 60 }),
    );
    expect(high.repository.awardXp).toHaveBeenCalledWith(expect.objectContaining({ gain: 20 }));
  });

  it("awards a fixed amount when min equals max", async () => {
    const { repository, handle } = setup({ random: () => 0.5 });

    await handle(configWith({ xp: { min: 7, max: 7, cooldownSeconds: 0 } }));

    expect(repository.awardXp).toHaveBeenCalledWith(expect.objectContaining({ gain: 7 }));
  });

  it("does nothing more when the cooldown blocks the award", async () => {
    const { repository, port, handle } = setup({ award: null });

    expect(await handle()).toEqual({ awarded: false });
    expect(repository.setLevel).not.toHaveBeenCalled();
    expect(port.announceLevelUp).not.toHaveBeenCalled();
  });

  it("stays quiet when XP is awarded but the level does not change", async () => {
    const { repository, port, handle } = setup({ award: { newXp: 50 }, random: () => 0 });

    expect(await handle()).toEqual({ awarded: true, level: 0, leveledUp: false });
    expect(repository.setLevel).not.toHaveBeenCalled();
    expect(port.announceLevelUp).not.toHaveBeenCalled();
  });
});

describe("level-ups", () => {
  // newXp = 100 with a gain of 15 (min, random 0): the member crosses from level 0 to level 1.
  const crossing = { award: { newXp: 100 }, random: () => 0 };

  it("stores the new level and announces it in the channel the member wrote in", async () => {
    const { repository, port, handle } = setup(crossing);

    expect(await handle()).toEqual({ awarded: true, level: 1, leveledUp: true });
    expect(repository.setLevel).toHaveBeenCalledWith(GUILD, USER, 1);
    expect(port.announceLevelUp).toHaveBeenCalledWith(`GG <@${USER}>, you reached level 1!`, null);
  });

  it("announces in a fixed channel when configured", async () => {
    const { port, handle } = setup(crossing);

    await handle(
      configWith({
        levelUp: {
          mode: "channel",
          channelId: CHANNEL,
          message: "Level {level} for {username} in {server}",
        },
      }),
    );

    expect(port.announceLevelUp).toHaveBeenCalledWith("Level 1 for ada in Forge", CHANNEL);
  });

  it("does not announce when the mode is off, but still stores the level", async () => {
    const { repository, port, handle } = setup(crossing);

    await handle(configWith({ levelUp: { mode: "off", channelId: null, message: "x" } }));

    expect(port.announceLevelUp).not.toHaveBeenCalled();
    expect(repository.setLevel).toHaveBeenCalled();
  });

  it("detects a level-up even when one message jumps several levels", async () => {
    const { handle } = setup({ award: { newXp: xpForLevel(3) + 5 }, random: () => 0.999 });

    const outcome = await handle(configWith({ xp: { min: 100, max: 100, cooldownSeconds: 0 } }));

    expect(outcome).toMatchObject({ awarded: true, level: 3, leveledUp: true });
  });
});

describe("role rewards", () => {
  const rewards = [
    { level: 5, roleId: ROLE_5 },
    { level: 10, roleId: ROLE_10 },
  ];

  it("grants every reward at or below the new level", async () => {
    const { port, handle } = setup({ award: { newXp: xpForLevel(5) + 3 }, random: () => 0 });

    await handle(
      configWith({ roleRewards: rewards, xp: { min: 15, max: 15, cooldownSeconds: 0 } }),
    );

    // newXp - 15 is still below level 5's threshold only if newXp - 15 < xpForLevel(5): it is (3 - 15 < 0).
    expect(port.grantRoles).toHaveBeenCalledWith([ROLE_5]);
  });

  it("does not grant rewards for levels not reached", async () => {
    const { port, handle } = setup({ award: { newXp: 100 }, random: () => 0 });

    await handle(configWith({ roleRewards: rewards }));

    expect(port.grantRoles).not.toHaveBeenCalled();
  });

  it("still grants roles when the announcement fails", async () => {
    const { port, handle } = setup({ award: { newXp: xpForLevel(5) + 3 }, random: () => 0 });
    port.announceLevelUp.mockRejectedValue(new Error("Unknown Channel"));

    await handle(
      configWith({ roleRewards: rewards, xp: { min: 15, max: 15, cooldownSeconds: 0 } }),
    );

    expect(port.grantRoles).toHaveBeenCalledWith([ROLE_5]);
  });

  it("does not throw when granting a role fails", async () => {
    const { port, handle } = setup({ award: { newXp: xpForLevel(5) + 3 }, random: () => 0 });
    port.grantRoles.mockRejectedValue(new Error("Missing Permissions"));

    await expect(
      handle(configWith({ roleRewards: rewards, xp: { min: 15, max: 15, cooldownSeconds: 0 } })),
    ).resolves.toMatchObject({ leveledUp: true });
  });
});
