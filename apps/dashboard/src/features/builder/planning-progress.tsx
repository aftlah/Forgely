"use client";

import { Check, FileText, LayoutGrid, ListChecks, PenLine, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/features/builder-demo/use-prefers-reduced-motion";

interface Step {
  label: string;
  icon: LucideIcon;
  /** When this step becomes the active one, in ms after planning starts. */
  startsAt: number;
}

/**
 * The stages a plan really goes through on the server. A Server Action cannot report back mid-flight, so
 * the moment each one is shown is an estimate (a plan takes about 10 seconds); the last stage simply stays
 * active until the real answer arrives.
 */
const STEPS: Step[] = [
  { label: "Read your request", icon: FileText, startsAt: 0 },
  { label: "Reading your server", icon: LayoutGrid, startsAt: 1_500 },
  { label: "Designing the plan", icon: PenLine, startsAt: 3_500 },
  { label: "Checking the plan", icon: ListChecks, startsAt: 9_000 },
];

const TYPING_INTERVAL_MS = 28;

function useActiveStep(): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timers = STEPS.map((step, index) =>
      window.setTimeout(() => setActive(index), step.startsAt),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);
  return active;
}

/** Reveals `text` one character at a time, from the moment the line is first shown. With reduced motion the whole text is there at once. */
function useTypedText(text: string, isTyping: boolean): string {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isTyping || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) window.clearInterval(timer);
        return Math.min(current + 1, text.length);
      });
    }, TYPING_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [text, isTyping, prefersReducedMotion]);

  return !isTyping || prefersReducedMotion ? text : text.slice(0, count);
}

function StepLine({ step, state }: { step: Step; state: "done" | "active" }) {
  const typed = useTypedText(step.label, state === "active");
  const Icon = state === "done" ? Check : step.icon;
  return (
    <li className={`flex items-center gap-3 text-[15px] ${state === "done" ? "" : "text-muted"}`}>
      <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
      {/* The full label is announced once; the typing is only visual. */}
      <span aria-hidden="true">{typed}</span>
      <span className="sr-only">{step.label}</span>
    </li>
  );
}

/** Shown in place of the AI's reply while a plan is being made. */
export function PlanningProgress() {
  const active = useActiveStep();
  return (
    <ol role="status" aria-label="Making the plan" className="m-0 grid list-none gap-2.5 p-0 py-1">
      {STEPS.slice(0, active + 1).map((step, index) => (
        <StepLine key={step.label} step={step} state={index < active ? "done" : "active"} />
      ))}
    </ol>
  );
}
