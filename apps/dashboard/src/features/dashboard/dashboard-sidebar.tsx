import Link from "next/link";

import { Button, LogoMark } from "@forgely/ui";

import { SidebarNav } from "./sidebar-nav";

import { signOut } from "@/auth";

async function signOutAction(): Promise<void> {
  "use server";
  await signOut({ redirectTo: "/" });
}

interface SidebarProps {
  /** The signed-in user's display name, or null when nobody is signed in. */
  userName: string | null;
}

/** Navigation shell: logo, the navigation for the current place, and the signed-in user. */
export function DashboardSidebar({ userName }: SidebarProps) {
  return (
    <aside
      aria-label="Dashboard navigation"
      className="flex flex-col border-b border-line bg-surface-inset p-4 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-r md:border-b-0 md:p-5"
    >
      <Link
        href="/"
        className="display mb-3 inline-flex md:mb-6 items-center gap-2.5 text-[19px] tracking-[-0.02em]"
      >
        <LogoMark />
        Forgely
      </Link>

      <SidebarNav />

      {userName && (
        <form
          action={signOutAction}
          className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 md:mt-auto md:block md:pt-4"
        >
          <p className="truncate text-sm text-muted md:mb-3">
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
