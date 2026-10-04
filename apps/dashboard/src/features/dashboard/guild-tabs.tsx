"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@forgely/ui";

const TABS = [
  { label: "Overview", path: "" },
  { label: "Moderation", path: "/moderation" },
  { label: "Welcome", path: "/welcome" },
  { label: "Leveling", path: "/leveling" },
  { label: "Role panels", path: "/role-panels" },
];

/** Section tabs inside one server. The current one is marked for screen readers as well as by color. */
export function GuildTabs({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${guildId}`;

  return (
    <nav
      aria-label="Server sections"
      className="mb-8 flex gap-1 overflow-x-auto border-b border-line"
    >
      {TABS.map((tab) => {
        const href = base + tab.path;
        const isCurrent = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors",
              isCurrent ? "border-ember text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
