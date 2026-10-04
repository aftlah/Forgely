import { Check } from "lucide-react";

import { EYEBROW, SECTION } from "./layout-classes";

import { PlanWindow } from "@/features/builder-demo/plan-window";

const POINTS = [
  "Edit or untick any item before applying",
  "Created in batches that respect Discord's rate limits",
  "Every build is saved so you can review it later",
];

export function PlanSection() {
  return (
    <section
      id="plan"
      className={`${SECTION} grid items-start gap-[clamp(32px,6vw,72px)] lg:grid-cols-[5fr_7fr]`}
    >
      <div>
        <p className={EYEBROW}>Plan preview</p>
        <h2 className="display mb-6 text-[clamp(30px,3.4vw,46px)]">
          Review the plan.
          <br />
          Then apply it.
        </h2>
        <p className="max-w-[46ch] text-muted">
          Forgely compares the plan with your current server and shows exactly what will be added,
          changed, or removed. Existing channels and roles are never deleted unless you tick them
          yourself.
        </p>
        <ul className="mt-7 grid list-none gap-3 p-0">
          {POINTS.map((point) => (
            <li key={point} className="flex items-center gap-3">
              <Check className="size-[18px] shrink-0 text-ember" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted">
          This page runs a simulation with sample plans. The real builder is part of the dashboard.
        </p>
      </div>
      <PlanWindow />
    </section>
  );
}
