import type { ModCaseType, OverviewRepository } from "@forgely/db";

import { LIST_LENGTH, MS_PER_WEEK } from "./constants";

import { MODULE_CATALOG } from "@/features/dashboard/module-catalog";
import type { OverviewRest } from "@/lib/discord-overview-rest";

export interface OverviewData {
  /** Null when Discord could not say. */
  memberCount: number | null;
  openTicketCount: number;
  openTickets: {
    ticketNumber: number;
    channelId: string;
    createdAt: Date;
    openerName: string | null;
  }[];
  topMembers: { rank: number; name: string | null; xp: number; level: number }[];
  modCasesThisWeek: number;
  recentCases: {
    caseNumber: number;
    type: ModCaseType;
    targetName: string | null;
    reason: string;
    createdAt: Date;
  }[];
  modules: { id: string; name: string; description: string; isEnabled: boolean }[];
}

export interface OverviewDependencies {
  repository: OverviewRepository;
  rest: OverviewRest;
  listModuleStates: (guildId: string) => Promise<{ moduleId: string; isEnabled: boolean }[]>;
  now?: () => Date;
}

/** Everything the page needs from the database and Discord, before names are looked up. */
async function fetchRaw(deps: OverviewDependencies, guildId: string, now: Date) {
  const { repository } = deps;
  const [memberCount, openTicketCount, tickets, top, cases, modCasesThisWeek, states] =
    await Promise.all([
      deps.rest.getMemberCount(guildId),
      repository.countOpenTickets(guildId),
      repository.listOpenTickets(guildId, LIST_LENGTH),
      repository.listTopMembers(guildId, LIST_LENGTH),
      repository.listRecentModCases(guildId, LIST_LENGTH),
      repository.countModCasesSince(guildId, new Date(now.getTime() - MS_PER_WEEK)),
      deps.listModuleStates(guildId),
    ]);
  return { memberCount, openTicketCount, tickets, top, cases, modCasesThisWeek, states };
}

type Raw = Awaited<ReturnType<typeof fetchRaw>>;

/** Every person the lists mention, so one Discord lookup can name them all. */
function collectUserIds(raw: Raw): string[] {
  return [
    ...raw.tickets.map((ticket) => ticket.openerId),
    ...raw.top.map((member) => member.userId),
    ...raw.cases.flatMap((entry) => (entry.targetId ? [entry.targetId] : [])),
  ];
}

function shapeOverview(raw: Raw, names: ReadonlyMap<string, string>): OverviewData {
  const nameOf = (id: string | null): string | null => (id ? (names.get(id) ?? null) : null);
  return {
    memberCount: raw.memberCount,
    openTicketCount: raw.openTicketCount,
    openTickets: raw.tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      channelId: ticket.channelId,
      createdAt: ticket.createdAt,
      openerName: nameOf(ticket.openerId),
    })),
    topMembers: raw.top.map((member, index) => ({
      rank: index + 1,
      name: nameOf(member.userId),
      xp: member.xp,
      level: member.level,
    })),
    modCasesThisWeek: raw.modCasesThisWeek,
    recentCases: raw.cases.map((entry) => ({
      caseNumber: entry.caseNumber,
      type: entry.type,
      targetName: nameOf(entry.targetId),
      reason: entry.reason,
      createdAt: entry.createdAt,
    })),
    modules: MODULE_CATALOG.map((module) => ({
      ...module,
      isEnabled: raw.states.some((state) => state.moduleId === module.id && state.isEnabled),
    })),
  };
}

/**
 * Gathers what the Overview page shows. Every number comes from our own database or from Discord; nothing is
 * estimated. A name Discord cannot give (the member left) comes back null and the page shows it as unknown.
 */
export async function loadOverview(
  deps: OverviewDependencies,
  guildId: string,
): Promise<OverviewData> {
  const now = (deps.now ?? (() => new Date()))();
  const raw = await fetchRaw(deps, guildId, now);
  const names = await deps.rest.getMemberNames(guildId, collectUserIds(raw));
  return shapeOverview(raw, names);
}
