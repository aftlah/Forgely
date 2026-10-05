import { describe, expect, it, vi } from "vitest";

import type { ModCaseRow, OverviewRepository, TicketRow } from "@forgely/db";

import { loadOverview, type OverviewDependencies } from "./load-overview";

const GUILD = "869020525853311026";
const ADA = "100000000000000001";
const BOB = "100000000000000002";
const GONE = "100000000000000003";
const NOW = new Date("2026-10-05T12:00:00Z");

const ticket = (patch: Partial<TicketRow> = {}): TicketRow => ({
  id: "t1",
  guildId: GUILD,
  ticketNumber: 4,
  channelId: "200000000000000001",
  openerId: ADA,
  status: "open",
  createdAt: new Date("2026-10-05T10:00:00Z"),
  closedAt: null,
  closedById: null,
  ...patch,
});

const modCase = (patch: Partial<ModCaseRow> = {}): ModCaseRow => ({
  id: "c1",
  guildId: GUILD,
  caseNumber: 9,
  type: "warn",
  targetId: BOB,
  moderatorId: ADA,
  reason: "spam",
  durationSeconds: null,
  createdAt: new Date("2026-10-05T11:00:00Z"),
  ...patch,
});

function setup(overrides: Partial<OverviewDependencies> = {}) {
  const repository = {
    countOpenTickets: vi.fn(async () => 1),
    listOpenTickets: vi.fn(async () => [ticket()]),
    listTopMembers: vi.fn(async () => [
      { guildId: GUILD, userId: ADA, xp: 900, level: 8, lastXpAt: NOW },
      { guildId: GUILD, userId: GONE, xp: 100, level: 2, lastXpAt: NOW },
    ]),
    listRecentModCases: vi.fn(async () => [
      modCase(),
      modCase({ caseNumber: 8, targetId: null, type: "purge" }),
    ]),
    countModCasesSince: vi.fn(async () => 3),
  } satisfies OverviewRepository;
  const rest = {
    getMemberCount: vi.fn(async () => 12 as number | null),
    getMemberNames: vi.fn(
      async () =>
        new Map([
          [ADA, "Ada"],
          [BOB, "Bob"],
        ]),
    ),
  };
  const deps = {
    repository,
    rest,
    listModuleStates: vi.fn(async () => [
      { moduleId: "welcome", isEnabled: true },
      { moduleId: "leveling", isEnabled: false },
    ]),
    now: () => NOW,
    ...overrides,
  } satisfies OverviewDependencies;
  return { deps, repository, rest };
}

describe("loadOverview", () => {
  it("gathers the real numbers and resolves names with one Discord lookup", async () => {
    const { deps, rest } = setup();
    const data = await loadOverview(deps, GUILD);

    expect(data.memberCount).toBe(12);
    expect(data.openTicketCount).toBe(1);
    expect(data.openTickets[0]).toMatchObject({ ticketNumber: 4, openerName: "Ada" });
    expect(data.modCasesThisWeek).toBe(3);
    expect(data.recentCases[0]).toMatchObject({ caseNumber: 9, type: "warn", targetName: "Bob" });
    expect(rest.getMemberNames).toHaveBeenCalledTimes(1);
  });

  it("ranks members from 1 and leaves a name null when the member left", async () => {
    const { deps } = setup();
    const { topMembers } = await loadOverview(deps, GUILD);
    expect(topMembers).toEqual([
      { rank: 1, name: "Ada", xp: 900, level: 8 },
      { rank: 2, name: null, xp: 100, level: 2 },
    ]);
  });

  it("does not look up a target for a case without one", async () => {
    const { deps, rest } = setup();
    const data = await loadOverview(deps, GUILD);
    expect(data.recentCases[1]?.targetName).toBeNull();
    expect(rest.getMemberNames).toHaveBeenCalledWith(GUILD, expect.not.arrayContaining([null]));
  });

  it("counts moderation actions over the last seven days", async () => {
    const { deps, repository } = setup();
    await loadOverview(deps, GUILD);
    expect(repository.countModCasesSince).toHaveBeenCalledWith(
      GUILD,
      new Date("2026-09-28T12:00:00Z"),
    );
  });

  it("shows the member count as unknown when Discord could not say", async () => {
    const { deps, rest } = setup();
    rest.getMemberCount.mockResolvedValueOnce(null);
    expect((await loadOverview(deps, GUILD)).memberCount).toBeNull();
  });

  it("marks each module on only when its stored row says so", async () => {
    const { deps } = setup();
    const { modules } = await loadOverview(deps, GUILD);
    const state = (id: string) => modules.find((module) => module.id === id)?.isEnabled;
    expect(state("welcome")).toBe(true);
    expect(state("leveling")).toBe(false);
    expect(state("tickets")).toBe(false);
  });
});
