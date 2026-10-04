import { describe, expect, it } from "vitest";

import { createMemoryCacheStore } from "./memory-cache-store";

describe("createMemoryCacheStore", () => {
  it("returns a stored value until it expires", async () => {
    let currentTime = 1_000;
    const cache = createMemoryCacheStore(() => currentTime);

    await cache.set("key", "value", 10);
    expect(await cache.get("key")).toBe("value");

    currentTime += 10_000;
    expect(await cache.get("key")).toBeNull();
  });

  it("returns null for unknown keys and after delete", async () => {
    const cache = createMemoryCacheStore();

    expect(await cache.get("missing")).toBeNull();

    await cache.set("key", "value", 60);
    await cache.delete("key");
    expect(await cache.get("key")).toBeNull();
  });
});
