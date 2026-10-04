"use client";

import { useState } from "react";

import type { SaveActionResult } from "./actions";
import { isEqual } from "./is-equal";

import type { Delivery } from "@/lib/config-publisher";

export type SubmitState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; delivery: Delivery }
  | { status: "error"; message: string; fieldErrors: Record<string, string> };

const GENERIC_ERROR = "Something went wrong while saving. Nothing was changed. Try again.";

interface SettingsForm<TValue> {
  draft: TValue;
  update: (patch: Partial<TValue>) => void;
  isDirty: boolean;
  state: SubmitState;
  save: () => Promise<void>;
  discard: () => void;
  /** Replaces both the saved and the draft value, for when the server changed the data itself. */
  resetTo: (value: TValue) => void;
  /** The server's message for one field, e.g. `fieldError("welcome.message")`. */
  fieldError: (path: string) => string | undefined;
}

/**
 * State for a settings page: the draft the user is editing, whether it differs from what is saved,
 * and the outcome of the last save. A "saved" notice disappears as soon as the user edits again.
 */
export function useSettingsForm<TValue>(
  initial: TValue,
  submit: (value: TValue) => Promise<SaveActionResult>,
): SettingsForm<TValue> {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const isDirty = !isEqual(saved, draft);

  async function save(): Promise<void> {
    setState({ status: "saving" });
    try {
      const result = await submit(draft);
      if (result.ok) {
        setSaved(draft);
        setState({ status: "saved", delivery: result.delivery });
      } else {
        setState({ status: "error", message: result.message, fieldErrors: result.fieldErrors });
      }
    } catch {
      // A thrown error means the request itself failed (network, server crash), not a rejected save.
      setState({ status: "error", message: GENERIC_ERROR, fieldErrors: {} });
    }
  }

  const visibleState: SubmitState =
    isDirty && state.status === "saved" ? { status: "idle" } : state;
  const resetTo = (value: TValue): void => {
    setSaved(value);
    setDraft(value);
    setState({ status: "idle" });
  };

  return {
    draft,
    isDirty,
    state: visibleState,
    update: (patch) => setDraft((current) => ({ ...current, ...patch })),
    save,
    discard: () => resetTo(saved),
    resetTo,
    fieldError: (path) => (state.status === "error" ? state.fieldErrors[path] : undefined),
  };
}
