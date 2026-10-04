import { describe, expect, it } from "vitest";

import { buildBotInviteUrl, getBotInvitePermissions } from "./invite-url";

const ADMINISTRATOR = 1n << 3n;

describe("buildBotInviteUrl", () => {
  it("includes the client id and both scopes", () => {
    const url = new URL(buildBotInviteUrl("1556267228515794964"));

    expect(url.origin + url.pathname).toBe("https://discord.com/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("1556267228515794964");
    expect(url.searchParams.get("scope")).toBe("bot applications.commands");
  });

  it("never asks for Administrator", () => {
    const permissions = BigInt(getBotInvitePermissions());
    expect(permissions & ADMINISTRATOR).toBe(0n);
  });

  it("asks for the permissions the moderation commands need", () => {
    const permissions = BigInt(getBotInvitePermissions());
    const kick = 1n << 1n;
    const ban = 1n << 2n;
    const timeout = 1n << 40n;
    expect(permissions & kick).toBe(kick);
    expect(permissions & ban).toBe(ban);
    expect(permissions & timeout).toBe(timeout);
  });
});
