import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { renderThemeCss } from "./theme-css";
import { tokens } from "./tokens";

describe("theme.css", () => {
  it("is up to date with tokens.ts (run `pnpm --filter @forgely/ui generate:theme`)", () => {
    const committed = readFileSync(fileURLToPath(new URL("./theme.css", import.meta.url)), "utf8");
    expect(committed).toBe(renderThemeCss());
  });

  it("exposes the ember accent and avoids Tailwind's reserved `base` color name", () => {
    const css = renderThemeCss();
    expect(css).toContain(`--color-ember: ${tokens.color.ember[500]};`);
    expect(css).not.toContain("--color-base:");
  });
});
