import { ArrowRight } from "lucide-react";

import { buttonClasses } from "@forgely/ui";

import { CONTAINER } from "./layout-classes";

import { PromptBox } from "@/features/builder-demo/prompt-box";
import { getInviteHref } from "@/lib/invite";

export function Hero() {
  return (
    <section className={`${CONTAINER} relative pt-[clamp(72px,11vw,140px)] text-center`}>
      {/* Decorative texture only; it carries no information. */}
      <div aria-hidden="true" className="dot-grid absolute inset-x-0 -top-28 -z-10 h-[780px]" />

      <h1 className="display text-[clamp(40px,7.4vw,92px)]">
        Describe your server.
        <br />
        Forgely builds it.
      </h1>
      <p className="mx-auto mt-7 max-w-[56ch] text-[19px] text-muted">
        Categories, channels, roles, and permissions, planned from a few sentences. You review every
        change before anything is created.
      </p>

      <PromptBox />

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <a href={getInviteHref()} className={buttonClasses({ variant: "bone" })}>
          Add to Discord <ArrowRight className="size-[18px]" aria-hidden="true" />
        </a>
        <a href="#plan" className={buttonClasses({ variant: "ghost" })}>
          See the plan preview <ArrowRight className="size-[18px]" aria-hidden="true" />
        </a>
      </div>
      <p className="mt-5 text-sm text-muted">
        Free to start. Nothing is created until you press Apply.
      </p>
    </section>
  );
}
