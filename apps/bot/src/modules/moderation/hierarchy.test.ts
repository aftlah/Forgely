import { describe, expect, it } from "vitest";

import { getModerationBlocker } from "./hierarchy";
import type { ModerationParty } from "./moderation.types";

function party(id: string, highestRolePosition: number, isOwner = false): ModerationParty {
  return { id, highestRolePosition, isOwner };
}

const actor = party("actor", 5);
const bot = party("bot", 10);

function check(target: ModerationParty | null, targetId = "target", overrideActor = actor) {
  return getModerationBlocker({ actor: overrideActor, bot, targetId, target });
}

describe("getModerationBlocker", () => {
  it("allows a lower-ranked target", () => {
    expect(check(party("target", 1))).toBeUndefined();
  });

  it("blocks moderating yourself or the bot, even for non-members", () => {
    expect(check(null, "actor")).toBe("self");
    expect(check(null, "bot")).toBe("bot");
  });

  it("allows banning someone who is not in the server", () => {
    expect(check(null)).toBeUndefined();
  });

  it("blocks the server owner", () => {
    expect(check(party("target", 1, true))).toBe("owner");
  });

  it("blocks targets with an equal or higher role than the actor", () => {
    expect(check(party("target", 5))).toBe("actor_hierarchy");
    expect(check(party("target", 7))).toBe("actor_hierarchy");
  });

  it("lets the owner moderate anyone below the bot, regardless of roles", () => {
    expect(check(party("target", 9), "target", party("actor", 0, true))).toBeUndefined();
  });

  it("blocks targets the bot cannot outrank, even if the actor can", () => {
    const strongActor = party("actor", 20);
    expect(check(party("target", 10), "target", strongActor)).toBe("bot_hierarchy");
  });
});
