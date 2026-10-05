import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <DashboardSidebar />
      <main className="min-w-0 [--page-pad:clamp(20px,4vw,48px)] p-(--page-pad)">{children}</main>
    </div>
  );
}
