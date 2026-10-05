"use client";

import { Check } from "lucide-react";

import { Button } from "@forgely/ui";

import type { SubmitState } from "./use-settings-form";

interface SaveBarProps {
  isDirty: boolean;
  state: SubmitState;
  onSave: () => void;
  onDiscard: () => void;
  /** Overrides the "the bot picked up the change" text, for settings Discord applies directly. */
  savedText?: string;
}

const DELIVERY_TEXT = {
  instant: "Saved. The bot picked up the change.",
  delayed: "Saved. The bot will apply it within about 10 seconds.",
} as const;

/**
 * The form's footer. It is the single place that says whether anything is unsaved, saving, saved,
 * or failed, so the user always knows what state their settings are in.
 */
export function SaveBar({ isDirty, state, onSave, onDiscard, savedText }: SaveBarProps) {
  const isSaving = state.status === "saving";

  return (
    <div className="mt-8" aria-live="polite">
      {isDirty && (
        <div className="sticky bottom-4 z-10 flex animate-rise flex-wrap items-center justify-between gap-3 rounded-md border border-line-strong bg-surface-overlay py-3 pr-3.5 pl-4 text-sm motion-reduce:animate-none">
          <span className="inline-flex items-center gap-2.5">
            <i className="size-2 rounded-full bg-warning" aria-hidden="true" />
            Unsaved changes
          </span>
          <span className="inline-flex gap-2">
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={isSaving}>
              Discard
            </Button>
            <Button variant="bone" size="sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </span>
        </div>
      )}

      {state.status === "error" && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger bg-surface-overlay p-3 text-sm"
        >
          {state.message}
        </p>
      )}

      {state.status === "saved" && !isDirty && (
        <p role="status" className="flex items-center gap-2 text-sm text-success">
          <Check className="size-[18px]" aria-hidden="true" />
          {savedText ?? DELIVERY_TEXT[state.delivery]}
        </p>
      )}
    </div>
  );
}
