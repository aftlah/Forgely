import Link from "next/link";

import { Button, cn, LogoMark } from "@forgely/ui";

import { signOut } from "@/auth";

/** Modules that exist already live in each server's tabs. This is the roadmap, shown honestly. */
const MODULES = [
  { label: "Automod", isSoon: true },
  { label: "Tickets", isSoon: true },
  { label: "AI Builder", isSoon: true },
];

async function signOutAction(): Promise<void> {
  "use server";
  await signOut({ redirectTo: "/" });
}

interface SidebarProps {
  /** The signed-in user's display name, or null when nobody is signed in. */
  userName: string | null;
}

/** Navigation shell. Module links become real once their settings pages exist. */
export function DashboardSidebar({ userName }: SidebarProps) {
  return (
    <aside
      aria-label="Dashboard navigation"
      className="flex flex-col border-b border-line bg-surface-inset p-5 md:border-r md:border-b-0"
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
        className="mb-6 block border-l-[3px] border-ember bg-surface-raised px-3 py-2 text-sm"
      >
        Your servers
      </Link>

      <p className="mb-2 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
        Coming soon
      </p>
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

      {userName && (
        <form action={signOutAction} className="mt-8 border-t border-line pt-4 md:mt-auto">
          <p className="mb-3 truncate text-sm text-muted">
            Signed in as <span className="text-fg">{userName}</span>
          </p>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      )}
    </aside>
  );
}
