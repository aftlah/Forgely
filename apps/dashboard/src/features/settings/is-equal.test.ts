import { describe, expect, it } from "vitest";

import { isEqual } from "./is-equal";

describe("isEqual", () => {
  it("compares primitives", () => {
    expect(isEqual("a", "a")).toBe(true);
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(null, "")).toBe(false);
    expect(isEqual(false, 0)).toBe(false);
  });

  it("compares nested objects regardless of key order", () => {
    expect(isEqual({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true);
  });

  it("notices a changed nested value", () => {
    expect(isEqual({ welcome: { message: "Hi" } }, { welcome: { message: "Hello" } })).toBe(false);
  });

  it("treats array order as meaningful", () => {
    expect(isEqual(["a", "b"], ["b", "a"])).toBe(false);
    expect(isEqual(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("does not confuse arrays with objects, or missing keys with undefined values", () => {
    expect(isEqual([], {})).toBe(false);
    expect(isEqual({ a: undefined }, {})).toBe(false);
  });
});
