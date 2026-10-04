import Link from "next/link";

import { cn, LogoMark } from "@forgely/ui";

const MODULES = [
  { label: "Moderation" },
  { label: "Welcome" },
  { label: "Automod", isSoon: true },
  { label: "Leveling", isSoon: true },
  { label: "Tickets", isSoon: true },
  { label: "AI Builder", isSoon: true },
];

/** Navigation shell. Module links become real once a server can be selected (next step). */
export function DashboardSidebar() {
  return (
    <aside
      aria-label="Dashboard navigation"
      className="border-b border-line bg-surface-inset p-5 md:border-r md:border-b-0"
    >
      <Link
        href="/"
        className="display mb-6 inline-flex items-center gap-2.5 text-[19px] tracking-[-0.02em]"
      >
        <LogoMark />
        Forgely
      </Link>

      <p className="mb-2 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">Servers</p>
      <Link
        href="/dashboard"
        aria-current="page"
        className="mb-6 block border-l-[3px] border-ember bg-surface-raised px-3 py-2 text-sm"
      >
        Your servers
      </Link>

      <p className="mb-2 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">Modules</p>
      <ul className="m-0 list-none p-0 text-sm">
        {MODULES.map((module) => (
          <li
            key={module.label}
            className={cn("border-l-[3px] border-transparent px-3 py-2 text-muted opacity-60")}
          >
            {module.label}
            {module.isSoon && (
              <em className="ml-1.5 font-mono text-[10px] tracking-[0.06em] uppercase not-italic">
                soon
              </em>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
