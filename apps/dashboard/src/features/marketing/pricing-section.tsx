import { cn } from "@forgely/ui";

import { EYEBROW, SECTION, SECTION_HEADING } from "./layout-classes";

/** Draft numbers. Payments are out of scope until the core product ships. */
const PLANS = [
  {
    name: "Free",
    audience: "Small and new communities",
    includes: "1 server, 1 plan per month, moderation and welcome",
    price: "$0",
  },
  {
    name: "Pro",
    audience: "Active, growing communities",
    includes: "Unlimited plans, advanced moderation, analytics, tickets",
    price: "$6",
    isPopular: true,
  },
  {
    name: "Agency",
    audience: "People who run many servers",
    includes: "Up to 50 servers, your own templates, priority support",
    price: "$18",
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className={SECTION}>
      <p className={EYEBROW}>Pricing</p>
      <h2 className={`${SECTION_HEADING} mb-4 max-w-[16ch]`}>Start free.</h2>
      <p className="mb-7 text-sm text-muted">Draft numbers, not final.</p>

      <div role="table" aria-label="Pricing plans" className="border-t border-line">
        <div
          role="row"
          className="hidden grid-cols-[1.1fr_1.4fr_2.2fr_0.8fr] gap-4 border-b border-line py-3 font-mono text-xs tracking-[0.08em] text-muted uppercase md:grid"
        >
          <span role="columnheader">Plan</span>
          <span role="columnheader">For</span>
          <span role="columnheader">Includes</span>
          <span role="columnheader" className="text-right">
            Per month
          </span>
        </div>
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            role="row"
            className={cn(
              "grid gap-1 border-b border-line py-5 md:grid-cols-[1.1fr_1.4fr_2.2fr_0.8fr] md:items-baseline md:gap-4",
              plan.isPopular &&
                "-mx-4 rounded-md bg-surface-raised px-4 md:mx-0 md:rounded-none md:px-0",
            )}
          >
            <span role="rowheader" className="display text-[30px] whitespace-nowrap">
              {plan.name}
              {plan.isPopular && (
                <span className="ml-2.5 rounded-full bg-ember px-2.5 py-[5px] align-middle font-mono text-[11px] font-medium tracking-[0.06em] text-ink uppercase">
                  most used
                </span>
              )}
            </span>
            <span role="cell" className="text-muted">
              {plan.audience}
            </span>
            <span role="cell" className="text-muted">
              {plan.includes}
            </span>
            <span role="cell" className="display mt-2 text-[40px] md:mt-0 md:text-right">
              {plan.price}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
