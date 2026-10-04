import { describe, expect, it } from "vitest";

import { createTtlCache } from "./ttl-cache";

describe("createTtlCache", () => {
  it("returns a value until it expires", () => {
    let currentTime = 1_000;
    const cache = createTtlCache<string>(60_000, () => currentTime);

    cache.set("user", "value");
    expect(cache.get("user")).toBe("value");

    currentTime += 59_999;
    expect(cache.get("user")).toBe("value");

    currentTime += 1;
    expect(cache.get("user")).toBeUndefined();
  });

  it("keeps keys separate and returns undefined for unknown keys", () => {
    const cache = createTtlCache<number>(1_000);

    cache.set("a", 1);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
  });
});
