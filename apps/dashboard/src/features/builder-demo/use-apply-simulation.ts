import { useEffect, useState } from "react";

const STEP_INTERVAL_MS = 140;

interface ApplySimulation {
  /** Steps finished so far. */
  done: number;
  isRunning: boolean;
  hasFinished: boolean;
  start: () => void;
}

/**
 * Fakes the build progress that the real BullMQ job will report: one step at a time, so people
 * can see what "applying" looks like. With reduced motion it jumps straight to done.
 */
export function useApplySimulation(totalSteps: number, reduceMotion: boolean): ApplySimulation {
  const [done, setDone] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const isRunning = hasStarted && done < totalSteps;

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(
      () => setDone((current) => Math.min(current + 1, totalSteps)),
      STEP_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [isRunning, totalSteps]);

  function start(): void {
    setHasStarted(true);
    if (reduceMotion) setDone(totalSteps);
  }

  return { done, isRunning, hasFinished: hasStarted && done >= totalSteps, start };
}
