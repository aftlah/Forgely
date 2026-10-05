import { Gift, Hammer, ShieldCheck, Star, Ticket, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { buttonClasses, cn } from "@forgely/ui";

import { formatRelativeTime } from "./format-relative-time";
import type { OverviewData } from "./load-overview";

import { SettingsCard } from "@/features/settings/fields";

const LIST = "m-0 grid list-none gap-1 p-0";
const ROW = "flex items-center justify-between gap-3 rounded-lg px-2 py-2";
const EMPTY = "py-6 text-center text-sm text-muted";
const CHIPS = ["Channels", "Categories", "Roles"];

/** The nudge to the builder, the page's one strong call to action. */
export function BuilderBanner({ guildId }: { guildId: string }) {
  return (
    <section
      aria-label="AI Builder"
      className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-line bg-surface-raised p-5"
    >
      <div className="grid gap-2">
        <p className="font-mono text-[11px] tracking-[0.1em] text-ember uppercase">AI Builder</p>
        <p className="display text-[20px]">Set up your server in seconds</p>
        <ul aria-label="What it sets up" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {CHIPS.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-muted"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={`/dashboard/${guildId}/builder`}
        className={buttonClasses({ variant: "bone", size: "sm" })}
      >
        <Hammer className="size-4" aria-hidden="true" />
        Try AI Builder
      </Link>
    </section>
  );
}

interface StatProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}

function Stat({ label, value, note, icon: Icon }: StatProps) {
  return (
    <li className="grid gap-1.5 rounded-[14px] border border-line bg-surface-raised p-4">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </p>
      <p className="display text-[28px] leading-none">{value}</p>
      <p className="text-xs text-muted">{note}</p>
    </li>
  );
}

/** Four numbers that are real: members from Discord, the rest from our own database. */
export function StatRow({ data }: { data: OverviewData }) {
  const activeModules = data.modules.filter((module) => module.isEnabled).length;
  return (
    <ul
      aria-label="Server numbers"
      className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Stat
        label="Members"
        icon={Users}
        value={data.memberCount === null ? "—" : data.memberCount.toLocaleString("en-US")}
        note={data.memberCount === null ? "Discord didn't answer" : "from Discord"}
      />
      <Stat
        label="Open tickets"
        icon={Ticket}
        value={String(data.openTicketCount)}
        note={data.openTicketCount === 0 ? "all clear" : "waiting for the team"}
      />
      <Stat
        label="Features on"
        icon={Gift}
        value={`${activeModules} / ${data.modules.length}`}
        note="modules switched on"
      />
      <Stat
        label="Mod actions"
        icon={ShieldCheck}
        value={String(data.modCasesThisWeek)}
        note="in the last 7 days"
      />
    </ul>
  );
}

const displayName = (name: string | null): string => name ?? "Unknown member";

export function TopMembersCard({ data }: { data: OverviewData }) {
  return (
    <SettingsCard title="Top members" icon={Star} description="Ranked by XP from chatting.">
      {data.topMembers.length === 0 ? (
        <p className={EMPTY}>No XP earned yet. Turn on Leveling and chat to see the ranking.</p>
      ) : (
        <ol className={LIST}>
          {data.topMembers.map((member) => (
            <li key={member.rank} className={ROW}>
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-5 font-mono text-sm text-muted">{member.rank}</span>
                <span className="truncate">{displayName(member.name)}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                Level {member.level} · {member.xp.toLocaleString("en-US")} XP
              </span>
            </li>
          ))}
        </ol>
      )}
    </SettingsCard>
  );
}

export function OpenTicketsCard({ data, now }: { data: OverviewData; now: Date }) {
  return (
    <SettingsCard title="Open tickets" icon={Ticket} description="Longest waiting first.">
      {data.openTickets.length === 0 ? (
        <p className={EMPTY}>No open tickets.</p>
      ) : (
        <ul className={LIST}>
          {data.openTickets.map((ticket) => (
            <li key={ticket.channelId} className={ROW}>
              <span className="truncate">
                #{ticket.ticketNumber} · {displayName(ticket.openerName)}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {formatRelativeTime(ticket.createdAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}

export function FeaturesCard({ data, guildId }: { data: OverviewData; guildId: string }) {
  const active = data.modules.filter((module) => module.isEnabled).length;
  return (
    <SettingsCard
      title="Features"
      icon={Gift}
      action={
        <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">
          {active} / {data.modules.length} on
        </span>
      }
    >
      <ul aria-label="Features" className={LIST}>
        {data.modules.map((module) => (
          <li key={module.id}>
            <Link
              href={`/dashboard/${guildId}/${module.id}`}
              className={cn(ROW, "transition-colors hover:bg-surface-overlay")}
            >
              <span className="font-medium">{module.name}</span>
              <span className="flex items-center gap-2 font-mono text-xs text-muted">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 rounded-full",
                    module.isEnabled ? "bg-success" : "bg-line-strong",
                  )}
                />
                {module.isEnabled ? "On" : "Off"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}

const CASE_LABELS: Record<OverviewData["recentCases"][number]["type"], string> = {
  ban: "Ban",
  kick: "Kick",
  timeout: "Timeout",
  warn: "Warning",
  purge: "Purge",
};

export function RecentModCard({ data, now }: { data: OverviewData; now: Date }) {
  return (
    <SettingsCard title="Recent mod activity" icon={ShieldCheck}>
      {data.recentCases.length === 0 ? (
        <div className={EMPTY}>
          <p className="font-semibold text-fg">All quiet</p>
          <p>No moderation actions yet. They appear here as your mods take them.</p>
        </div>
      ) : (
        <ul className={LIST}>
          {data.recentCases.map((entry) => (
            <li key={entry.caseNumber} className="grid gap-0.5 rounded-lg px-2 py-2">
              <p className="flex items-center justify-between gap-3">
                <span className="truncate">
                  <span className="font-semibold">{CASE_LABELS[entry.type]}</span>
                  {entry.targetName ? ` · ${entry.targetName}` : ""}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  #{entry.caseNumber} · {formatRelativeTime(entry.createdAt, now)}
                </span>
              </p>
              <p className="truncate text-sm text-muted">{entry.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
