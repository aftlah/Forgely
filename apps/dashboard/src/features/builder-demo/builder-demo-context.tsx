"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { pickPlan, type Plan } from "./plans";

interface BuilderDemoState {
  /** The plan currently shown, or null before the first submit. */
  plan: Plan | null;
  /** Changes on every submit, so submitting the same text again replays the plan. */
  runId: number;
  showPlan: (promptText: string) => void;
}

const BuilderDemoContext = createContext<BuilderDemoState | null>(null);

/** Connects the hero prompt box to the plan preview further down the page. */
export function BuilderDemoProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [runId, setRunId] = useState(0);

  const value = useMemo<BuilderDemoState>(
    () => ({
      plan,
      runId,
      showPlan: (promptText) => {
        setPlan(pickPlan(promptText));
        setRunId((current) => current + 1);
      },
    }),
    [plan, runId],
  );

  return <BuilderDemoContext.Provider value={value}>{children}</BuilderDemoContext.Provider>;
}

export function useBuilderDemo(): BuilderDemoState {
  const state = useContext(BuilderDemoContext);
  if (!state) throw new Error("useBuilderDemo must be used inside <BuilderDemoProvider>");
  return state;
}
