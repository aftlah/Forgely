import type { ReactNode } from "react";

import { SiteFooter } from "@/features/marketing/site-footer";
import { SiteNav } from "@/features/marketing/site-nav";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
