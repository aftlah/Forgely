import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limiter";

describe("createRateLimiter", () => {
  it("allows up to the limit, then refuses", () => {
    const limiter = createRateLimiter(3, 60_000, () => 0);

    expect([1, 2, 3, 4].map(() => limiter.tryAcquire("user"))).toEqual([true, true, true, false]);
  });

  it("starts a fresh window once the old one has passed", () => {
    let currentTime = 0;
    const limiter = createRateLimiter(1, 1_000, () => currentTime);

    expect(limiter.tryAcquire("user")).toBe(true);
    expect(limiter.tryAcquire("user")).toBe(false);

    currentTime = 1_000;
    expect(limiter.tryAcquire("user")).toBe(true);
  });

  it("counts each key separately", () => {
    const limiter = createRateLimiter(1, 60_000, () => 0);

    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("b")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(false);
  });
});
