import { describe, expect, it } from "vitest";

import { panelIdSchema } from "@forgely/shared";

import { generatePanelId } from "./panel-id";

describe("generatePanelId", () => {
  it("always satisfies the shared panel id schema", () => {
    for (let run = 0; run < 500; run += 1) {
      expect(panelIdSchema.safeParse(generatePanelId()).success).toBe(true);
    }
  });

  it("does not repeat in practice", () => {
    const ids = new Set(Array.from({ length: 2000 }, generatePanelId));

    expect(ids.size).toBe(2000);
  });
});
