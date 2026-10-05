import { describe, expect, it } from "vitest";

import { classifyAccess, planAccessWrites, type CurrentOverwrite } from "./access-overwrites";
import { PERMISSION } from "./constants";

const EVERYONE = "869020525853311026";
const BOT = "111111111111111111";
const STAFF = "200000000000000001";
const FOUNDER = "200000000000000002";
const OLD_ROLE = "200000000000000003";

const VIEW = PERMISSION.viewChannel;
const SEND = PERMISSION.sendMessages;
const HISTORY = PERMISSION.readMessageHistory;
const CONNECT = PERMISSION.connect;
const MANAGE_MESSAGES = 1n << 13n;

const overwrite = (id: string, allow: bigint, deny: bigint, type = 0): CurrentOverwrite => ({
  id,
  type,
  allow: allow.toString(),
  deny: deny.toString(),
});

describe("classifyAccess", () => {
  it("reads no overwrites as public", () => {
    expect(classifyAccess(undefined, EVERYONE, "text")).toEqual({
      access: "public",
      viewRoleIds: [],
    });
    expect(classifyAccess([], EVERYONE, "text").access).toBe("public");
  });

  it("reads a denied View for @everyone as private, with the roles that are let in", () => {
    const state = classifyAccess(
      [overwrite(EVERYONE, 0n, VIEW), overwrite(STAFF, VIEW, 0n), overwrite(BOT, VIEW, 0n, 1)],
      EVERYONE,
      "text",
    );
    // The bot is a member overwrite, not a role, so it is not listed.
    expect(state).toEqual({ access: "private", viewRoleIds: [STAFF] });
  });

  it("reads a denied Send for @everyone as read-only, but never for voice", () => {
    const overwrites = [overwrite(EVERYONE, 0n, SEND)];
    expect(classifyAccess(overwrites, EVERYONE, "text").access).toBe("read-only");
    expect(classifyAccess(overwrites, EVERYONE, "voice").access).toBe("public");
  });
});

describe("planAccessWrites", () => {
  const base = { everyoneId: EVERYONE, botUserId: BOT, current: undefined };

  it("makes a public text channel private: hides it from @everyone, lets the roles and the bot in", () => {
    const writes = planAccessWrites({
      ...base,
      kind: "text",
      access: "private",
      allowedRoleIds: [STAFF, FOUNDER],
    });
    const byId = new Map(writes.puts.map((p) => [p.id, p]));
    expect(byId.get(EVERYONE)).toMatchObject({ type: 0, allow: "0", deny: VIEW.toString() });
    expect(byId.get(STAFF)?.allow).toBe((VIEW | SEND | HISTORY).toString());
    expect(byId.get(FOUNDER)?.type).toBe(0);
    expect(byId.get(BOT)?.type).toBe(1);
    expect(writes.deletes).toEqual([]);
  });

  it("uses View and Connect for a private voice channel", () => {
    const writes = planAccessWrites({
      ...base,
      kind: "voice",
      access: "private",
      allowedRoleIds: [STAFF],
    });
    expect(writes.puts.find((p) => p.id === STAFF)?.allow).toBe((VIEW | CONNECT).toString());
  });

  it("removes the hiding when a private channel becomes public, deleting an overwrite that ends up empty", () => {
    const writes = planAccessWrites({
      ...base,
      kind: "text",
      access: "public",
      allowedRoleIds: [],
      current: [overwrite(EVERYONE, 0n, VIEW)],
    });
    expect(writes.puts).toEqual([]);
    expect(writes.deletes).toEqual([{ id: EVERYONE, type: 0 }]);
  });

  it("keeps every other permission someone set on @everyone", () => {
    const writes = planAccessWrites({
      ...base,
      kind: "text",
      access: "read-only",
      allowedRoleIds: [],
      current: [overwrite(EVERYONE, MANAGE_MESSAGES, 0n)],
    });
    const everyone = writes.puts.find((p) => p.id === EVERYONE)!;
    expect(BigInt(everyone.allow) & MANAGE_MESSAGES).toBe(MANAGE_MESSAGES);
    expect(BigInt(everyone.deny) & SEND).toBe(SEND);
  });

  it("takes access away from a role that is no longer wanted, without touching its other permissions", () => {
    const writes = planAccessWrites({
      ...base,
      kind: "text",
      access: "private",
      allowedRoleIds: [STAFF],
      current: [overwrite(OLD_ROLE, VIEW | SEND | MANAGE_MESSAGES, 0n)],
    });
    const old = writes.puts.find((p) => p.id === OLD_ROLE)!;
    expect(BigInt(old.allow)).toBe(MANAGE_MESSAGES);
  });

  it("does nothing when the channel already has the access, so a re-run writes nothing", () => {
    const current = [
      overwrite(EVERYONE, 0n, VIEW),
      overwrite(STAFF, VIEW | SEND | HISTORY, 0n),
      overwrite(BOT, VIEW | SEND | HISTORY, 0n, 1),
    ];
    const writes = planAccessWrites({
      ...base,
      kind: "text",
      access: "private",
      allowedRoleIds: [STAFF],
      current,
    });
    expect(writes).toEqual({ puts: [], deletes: [] });
  });

  it("never touches other roles when the channel is made public or read-only", () => {
    const writes = planAccessWrites({
      ...base,
      kind: "text",
      access: "public",
      allowedRoleIds: [],
      current: [overwrite(EVERYONE, 0n, VIEW), overwrite(OLD_ROLE, VIEW, 0n)],
    });
    expect([...writes.puts.map((p) => p.id), ...writes.deletes.map((d) => d.id)]).toEqual([
      EVERYONE,
    ]);
  });

  it("treats read-only voice as public", () => {
    const writes = planAccessWrites({
      ...base,
      kind: "voice",
      access: "read-only",
      allowedRoleIds: [],
    });
    expect(writes).toEqual({ puts: [], deletes: [] });
  });
});
