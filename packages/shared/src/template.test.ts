import { describe, expect, it } from "vitest";

import { renderTemplate } from "./template";

describe("renderTemplate", () => {
  it("replaces known placeholders", () => {
    const result = renderTemplate("Hi {user}, welcome to {server}!", {
      user: "<@1>",
      server: "Forge",
    });
    expect(result).toBe("Hi <@1>, welcome to Forge!");
  });

  it("replaces every occurrence", () => {
    expect(renderTemplate("{a}{a}", { a: "x" })).toBe("xx");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(renderTemplate("Hello {nope}", { user: "x" })).toBe("Hello {nope}");
  });

  it("does not expand placeholders inside substituted values", () => {
    expect(renderTemplate("{user}", { user: "{server}", server: "Forge" })).toBe("{server}");
  });

  it("does not resolve inherited object properties", () => {
    expect(renderTemplate("{constructor} {toString}", {})).toBe("{constructor} {toString}");
  });
});
