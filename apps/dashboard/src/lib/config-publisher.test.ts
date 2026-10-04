import { describe, expect, it, vi } from "vitest";

import { REDIS_CHANNELS } from "@forgely/shared";

import { createConfigPublisher } from "./config-publisher";

const GUILD_ID = "869020525853311026";

describe("createConfigPublisher", () => {
  it("publishes a validated message on the shared channel and reports 'instant'", async () => {
    const redis = { publish: vi.fn(async () => 1) };

    const delivery = await createConfigPublisher(redis)(GUILD_ID, "welcome");

    expect(delivery).toBe("instant");
    expect(redis.publish).toHaveBeenCalledWith(
      REDIS_CHANNELS.configUpdated,
      JSON.stringify({ guildId: GUILD_ID, moduleId: "welcome" }),
    );
  });

  it("reports 'delayed' and sends nothing when Redis is not configured", async () => {
    expect(await createConfigPublisher(null)(GUILD_ID, "welcome")).toBe("delayed");
  });

  it("reports 'delayed' instead of failing when Redis errors", async () => {
    const redis = {
      publish: vi.fn(async () => {
        throw new Error("connection refused");
      }),
    };

    expect(await createConfigPublisher(redis)(GUILD_ID, "welcome")).toBe("delayed");
  });

  it("never publishes a malformed guild ID", async () => {
    const redis = { publish: vi.fn(async () => 1) };

    expect(await createConfigPublisher(redis)("not-an-id", "welcome")).toBe("delayed");
    expect(redis.publish).not.toHaveBeenCalled();
  });
});
