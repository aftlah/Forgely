"use client";

import {
  Hammer,
  LayoutGrid,
  Server,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
  Ticket,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@forgely/ui";

interface NavItem {
  label: string;
  /** Path under /dashboard/<guildId>. */
  path: string;
  icon: LucideIcon;
  /** Modules on the roadmap are listed but not linked. */
  isSoon?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GUILD_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [
      { label: "Overview", path: "", icon: LayoutGrid },
      { label: "AI Builder", path: "/builder", icon: Hammer },
    ],
  },
  {
    title: "Welcome & onboarding",
    items: [
      { label: "Welcome", path: "/welcome", icon: UserPlus },
      { label: "Role panels", path: "/role-panels", icon: Tag },
    ],
  },
  {
    title: "Safety",
    items: [
      { label: "Moderation", path: "/moderation", icon: ShieldCheck },
      { label: "Automod", path: "/automod", icon: ShieldAlert },
    ],
  },
  {
    title: "Engagement",
    items: [
      { label: "Leveling", path: "/leveling", icon: Star },
      { label: "Tickets", path: "/tickets", icon: Ticket },
    ],
  },
];

const ITEM_BASE =
  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors";

/** Matches /dashboard/<guildId> and returns the id, or null on the server picker. */
function readGuildId(pathname: string): string | null {
  const match = /^\/dashboard\/(\d{17,20})(?:\/|$)/.exec(pathname);
  return match?.[1] ?? null;
}

/**
 * Navigation for the current place: the server picker, or one server's modules in labelled groups.
 * The current page is marked for screen readers as well as by color.
 */
export function SidebarNav() {
  const pathname = usePathname();
  const guildId = readGuildId(pathname);

  if (!guildId) {
    return (
      <nav aria-label="Dashboard">
        <Link
          href="/dashboard"
          aria-current={pathname === "/dashboard" ? "page" : undefined}
          className={cn(ITEM_BASE, "bg-surface-raised text-fg")}
        >
          <Server className="size-4" aria-hidden="true" />
          Your servers
        </Link>
      </nav>
    );
  }

  const base = `/dashboard/${guildId}`;
  // On a phone the groups flatten into one row that scrolls sideways, so the page content is not pushed down.
  return (
    <nav
      aria-label="Server sections"
      className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:items-stretch md:gap-5 md:overflow-visible md:pb-0"
    >
      <Link
        href="/dashboard"
        className="shrink-0 pr-2 font-mono text-[11px] tracking-[0.06em] whitespace-nowrap text-muted uppercase transition-colors hover:text-fg"
      >
        ← Switch server
      </Link>
      {GUILD_GROUPS.map((group) => (
        <div key={group.title} className="contents md:block">
          <p className="mb-1.5 hidden px-3 font-mono text-[11px] tracking-[0.1em] text-muted uppercase md:block">
            {group.title}
          </p>
          <ul className="contents m-0 list-none p-0 md:grid md:gap-0.5">
            {group.items.map((item) => {
              const href = base + item.path;
              const isCurrent = pathname === href;
              const Icon = item.icon;
              if (item.isSoon) {
                return (
                  <li
                    key={item.label}
                    className={cn(ITEM_BASE, "shrink-0 text-muted opacity-60 md:shrink")}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                    <em className="ml-auto font-mono text-[10px] tracking-[0.06em] uppercase not-italic">
                      soon
                    </em>
                  </li>
                );
              }
              return (
                <li key={item.label} className="shrink-0 md:shrink">
                  <Link
                    href={href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      ITEM_BASE,
                      isCurrent
                        ? "bg-bone text-ink"
                        : "text-muted hover:bg-surface-raised hover:text-fg",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
