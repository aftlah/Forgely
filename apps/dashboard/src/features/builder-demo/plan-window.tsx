"use client";

import { useState } from "react";

import { Button, cn, Window } from "@forgely/ui";

import { useBuilderDemo } from "./builder-demo-context";
import { getApplySteps, summarizePlan, type Plan, type PlanItem } from "./plans";
import { useApplySimulation } from "./use-apply-simulation";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

const ROW_STAGGER_MS = 45;
const PERCENT = 100;

const OP_STYLE = { "+": "text-success", "~": "text-warning", "-": "text-danger" } as const;

function DiffRow({
  item,
  index,
  isSelected,
  onToggle,
}: {
  item: PlanItem;
  index: number;
  isSelected: boolean;
  onToggle: (name: string) => void;
}) {
  const style = { animationDelay: `${index * ROW_STAGGER_MS}ms` };
  const base =
    "grid animate-rise grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 px-5 py-[7px] font-mono text-sm motion-reduce:animate-none";

  if (item.kind === "group") {
    return (
      <li
        style={style}
        className={cn(base, "mt-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.06em]")}
      >
        <span className="text-center text-muted" aria-hidden="true">
          ▾
        </span>
        <span>{item.name}</span>
      </li>
    );
  }

  const isRemoval = item.op === "-";
  return (
    <li style={style} className={cn(base, isRemoval && "opacity-80")}>
      <span className={cn("text-center font-medium", OP_STYLE[item.op])} aria-hidden="true">
        {isRemoval ? "−" : item.op}
      </span>
      {isRemoval ? (
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(item.name)}
            className="size-4 accent-danger"
          />
          <span>
            <span className="sr-only">Remove </span>
            {item.name}
          </span>
        </label>
      ) : (
        <span>{item.name}</span>
      )}
      <span className="text-xs text-muted">{item.detail}</span>
    </li>
  );
}

function getStatusText(state: {
  hasFinished: boolean;
  isRunning: boolean;
  done: number;
  total: number;
  currentName: string | undefined;
}): string {
  if (state.hasFinished) return "Done (simulation: nothing was created)";
  if (state.isRunning && state.currentName) {
    return `Applying ${state.done}/${state.total}: ${state.currentName}`;
  }
  return "Ready to apply";
}

/** One plan's diff, with removal checkboxes and the simulated apply step. */
function PlanDiff({ plan }: { plan: Plan }) {
  const reduceMotion = usePrefersReducedMotion();
  const [selectedRemovals, setSelectedRemovals] = useState<ReadonlySet<string>>(new Set());
  const steps = getApplySteps(plan, selectedRemovals);
  const summary = summarizePlan(plan, selectedRemovals);
  const simulation = useApplySimulation(steps.length, reduceMotion);

  function toggleRemoval(name: string): void {
    setSelectedRemovals((current) => {
      const next = new Set(current);
      if (!next.delete(name)) next.add(name);
      return next;
    });
  }

  const percent = steps.length ? Math.round((simulation.done / steps.length) * PERCENT) : 0;
  const status = getStatusText({
    hasFinished: simulation.hasFinished,
    isRunning: simulation.isRunning,
    done: simulation.done,
    total: steps.length,
    currentName: steps[simulation.done - 1]?.name,
  });

  return (
    <>
      <div className="flex justify-between gap-3 border-b border-line px-5 py-3.5 font-mono text-xs text-muted">
        <span>{plan.title}</span>
        <span>
          {summary.added} added · {summary.changed} changed · {summary.removed} removed
        </span>
      </div>
      <ul className="max-h-[440px] list-none overflow-auto py-2">
        {plan.items.map((item, index) => (
          <DiffRow
            key={`${item.kind}-${item.name}`}
            item={item}
            index={index}
            isSelected={item.kind === "change" && selectedRemovals.has(item.name)}
            onToggle={toggleRemoval}
          />
        ))}
      </ul>
      <div className="border-t border-line px-5 pt-4 pb-[18px]">
        <div
          role="progressbar"
          aria-label="Build progress"
          aria-valuemin={0}
          aria-valuemax={PERCENT}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-full bg-surface-inset"
        >
          <span
            className="block h-full bg-ember transition-[width] duration-150 ease-linear motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-muted" role="status">
            {status}
          </span>
          <Button
            variant="ember"
            size="sm"
            onClick={simulation.start}
            disabled={simulation.isRunning || simulation.hasFinished}
          >
            Approve and apply
          </Button>
        </div>
      </div>
    </>
  );
}

/** Shows the plan produced by the hero prompt box, or an empty state before the first submit. */
export function PlanWindow() {
  const { plan, runId } = useBuilderDemo();

  return (
    <Window aria-live="polite">
      {plan ? (
        <PlanDiff key={`${plan.id}-${runId}`} plan={plan} />
      ) : (
        <>
          <div className="flex justify-between border-b border-line px-5 py-3.5 font-mono text-xs text-muted">
            <span>no plan yet</span>
          </div>
          <p className="px-6 py-12 text-center font-mono text-sm text-muted">
            Describe a community above and press the arrow to see a plan here.
          </p>
        </>
      )}
    </Window>
  );
}
