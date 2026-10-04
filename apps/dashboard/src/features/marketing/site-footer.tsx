import { ArrowRight } from "lucide-react";

import { buttonClasses } from "@forgely/ui";

import { getInviteHref } from "@/lib/invite";

export function SiteFooter() {
  return (
    <footer className="mt-[clamp(80px,11vw,150px)] border-t border-line bg-surface-raised px-[clamp(16px,5vw,48px)] pt-[clamp(56px,8vw,96px)] pb-8">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-8">
        <h2 className="display max-w-[18ch] text-[clamp(30px,4.4vw,52px)]">
          An empty server shouldn&apos;t take a weekend.
        </h2>
        <a href={getInviteHref()} className={buttonClasses({ variant: "ember" })}>
          Add to Discord <ArrowRight className="size-[18px]" aria-hidden="true" />
        </a>
      </div>
      <div className="mx-auto mt-16 flex max-w-[1180px] flex-wrap justify-between gap-4 border-t border-line pt-5 text-sm text-muted">
        <span>© {new Date().getFullYear()} Forgely</span>
        <span className="flex gap-5">
          <a href="#" className="hover:text-fg">
            Terms
          </a>
          <a href="#" className="hover:text-fg">
            Privacy
          </a>
          <a href="#" className="hover:text-fg">
            Contact
          </a>
        </span>
      </div>
    </footer>
  );
}
