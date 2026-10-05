import Link from "next/link";

import { LogoMark } from "@forgely/ui";

import { SidebarNav } from "./sidebar-nav";

/** Navigation shell: logo and the navigation for the current place. The signed-in user lives in the top bar. */
export function DashboardSidebar() {
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
    </aside>
  );
}
