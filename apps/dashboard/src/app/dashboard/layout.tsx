import type { Metadata } from "next";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <DashboardSidebar userName={session?.user?.name ?? null} />
      <main className="p-[clamp(20px,4vw,48px)]">{children}</main>
    </div>
  );
}
