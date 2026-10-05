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
  /**
   * Saves the draft, or `value` when given (the draft then becomes that value too). Resolves to the
   * server's message when the save failed, or null when it worked.
   */
  save: (value?: TValue) => Promise<string | null>;
  discard: () => void;
  /** Replaces both the saved and the draft value, for when the server changed the data itself. */
  resetTo: (value: TValue) => void;
  /** The server's message for one field, e.g. `fieldError("welcome.message")`. */
  fieldError: (path: string) => string | undefined;
}

type SubmitOutcome =
  | { ok: true; delivery: Delivery }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

/** Runs the save and folds a thrown error (network, server crash) into the same shape as a refusal. */
async function trySubmit<TValue>(
  submit: (value: TValue) => Promise<SaveActionResult>,
  value: TValue,
): Promise<SubmitOutcome> {
  try {
    const result = await submit(value);
    if (result.ok) return { ok: true, delivery: result.delivery };
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  } catch {
    return { ok: false, message: GENERIC_ERROR, fieldErrors: {} };
  }
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

  async function save(value: TValue = draft): Promise<string | null> {
    setState({ status: "saving" });
    const outcome = await trySubmit(submit, value);
    if (!outcome.ok) {
      setState({ status: "error", message: outcome.message, fieldErrors: outcome.fieldErrors });
      return outcome.message;
    }
    setSaved(value);
    // Only an explicit value replaces the draft; otherwise edits made while saving are kept.
    if (value !== draft) setDraft(value);
    setState({ status: "saved", delivery: outcome.delivery });
    return null;
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
