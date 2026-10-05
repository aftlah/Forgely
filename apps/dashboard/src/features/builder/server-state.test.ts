import { describe, expect, it } from "vitest";

import { buildExistingItems, buildSnapshot, CHANNEL_TYPE } from "./server-state";

const GUILD = "869020525853311026";

describe("buildSnapshot", () => {
  it("groups channels under their category and leaves @everyone out of the roles", () => {
    const snapshot = buildSnapshot(
      GUILD,
      [
        { id: "300000000000000001", name: "Info", type: CHANNEL_TYPE.category, parent_id: null },
        {
          id: "300000000000000002",
          name: "rules",
          type: CHANNEL_TYPE.text,
          parent_id: "300000000000000001",
        },
        {
          id: "300000000000000003",
          name: "Lounge",
          type: CHANNEL_TYPE.voice,
          parent_id: "300000000000000001",
        },
        { id: "300000000000000004", name: "stage", type: 13, parent_id: "300000000000000001" },
        { id: "300000000000000005", name: "loose", type: CHANNEL_TYPE.text, parent_id: null },
      ],
      [
        { id: GUILD, name: "@everyone" },
        { id: "200000000000000001", name: "Mod" },
      ],
    );
    expect(snapshot.roles).toEqual(["Mod"]);
    expect(snapshot.categories).toEqual([
      {
        name: "Info",
        channels: [
          { name: "rules", kind: "text" },
          { name: "Lounge", kind: "voice" },
          { name: "stage", kind: "other" },
        ],
      },
      { name: null, channels: [{ name: "loose", kind: "text" }] },
    ]);
  });

  it("omits the uncategorized group when there are no loose channels", () => {
    expect(buildSnapshot(GUILD, [], []).categories).toEqual([]);
  });
});

describe("buildExistingItems", () => {
  const RULES = "300000000000000002";
  const channels = [
    { id: "300000000000000001", name: "Info", type: CHANNEL_TYPE.category, parent_id: null },
    { id: RULES, name: "rules", type: CHANNEL_TYPE.text, parent_id: "300000000000000001" },
    {
      id: "300000000000000003",
      name: "chat",
      type: CHANNEL_TYPE.text,
      parent_id: "300000000000000001",
    },
    { id: "300000000000000004", name: "stage", type: 13, parent_id: null },
  ];
  const roles = [
    { id: GUILD, name: "@everyone", managed: false },
    { id: "200000000000000001", name: "Mod", managed: false },
    { id: "200000000000000002", name: "Some Bot", managed: true },
    { id: "200000000000000003", name: "Unknown", managed: undefined },
  ];
  const items = buildExistingItems(GUILD, channels, roles, new Set([RULES]));
  const byName = (name: string) => items.find((item) => item.name === name);

  it("gives each kind its own short ref", () => {
    expect(items.map((item) => item.ref)).toEqual(["r1", "r2", "r3", "k1", "h1", "h2", "h3"]);
  });

  it("protects what Discord relies on, bot-owned roles, unknown channel types, and unclear roles", () => {
    expect(byName("rules")?.isProtected).toBe(true);
    expect(byName("Some Bot")?.isProtected).toBe(true);
    expect(byName("stage")?.isProtected).toBe(true);
    expect(byName("Unknown")?.isProtected).toBe(true);
  });

  it("leaves hand-made roles and ordinary channels deletable, and never lists @everyone", () => {
    expect(byName("Mod")?.isProtected).toBe(false);
    expect(byName("chat")).toMatchObject({ isProtected: false, parentName: "Info" });
    expect(byName("@everyone")).toBeUndefined();
  });
});
