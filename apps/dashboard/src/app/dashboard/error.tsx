"use client";

import { Button, Window } from "@forgely/ui";

/** Error boundary for dashboard pages. Shows a plain message and a retry, never a stack trace. */
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Window className="max-w-[640px] p-8" role="alert">
      <h1 className="display mb-2 text-[22px]">That page didn&apos;t load</h1>
      <p className="mb-6 text-muted">
        Something went wrong on our side. Your settings were not changed. Try again in a moment.
      </p>
      <Button variant="bone" onClick={reset}>
        Try again
      </Button>
    </Window>
  );
}
