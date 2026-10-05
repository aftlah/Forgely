"use client";

import { useState } from "react";

import type { PlanDeletion } from "@forgely/ai";
import { Button } from "@forgely/ui";

import { describeSummary, type CreationSummary } from "./creation-summary";

/** The word to type before anything is deleted. A click alone is too easy to do by accident. */
const CONFIRM_WORD = "delete";

interface ApplyPanelProps {
  summary: CreationSummary;
  deletionSummary: CreationSummary;
  /** The items that would be deleted, so the confirmation can name them. */
  deleting: PlanDeletion[];
  isConfirming: boolean;
  isApplying: boolean;
  onAskToConfirm: () => void;
  onCancel: () => void;
  onApply: () => void;
  onStartOver: () => void;
}

function describeAction(summary: CreationSummary, deletionSummary: CreationSummary): string {
  const parts = [
    summary.total > 0 ? `create ${describeSummary(summary)}` : null,
    deletionSummary.total > 0 ? `delete ${describeSummary(deletionSummary)}` : null,
  ].filter((part): part is string => part !== null);
  return parts.join(" and ");
}

function DeletionWarning({ deleting }: { deleting: PlanDeletion[] }) {
  return (
    <div className="mt-3 grid gap-2 rounded-md border border-danger p-3 text-sm">
      <p className="font-semibold text-danger">Deleting can&apos;t be undone.</p>
      <ul className="m-0 grid list-none gap-0.5 p-0">
        {deleting.map((deletion) => (
          <li key={deletion.id} className="break-all">
            <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
              {deletion.kind}
            </span>{" "}
            {deletion.name}
          </li>
        ))}
      </ul>
      <p className="text-muted">
        Deleting a category keeps the channels inside it; they just lose their category. Messages in
        a deleted channel are gone for good.
      </p>
    </div>
  );
}

function ConfirmDialog(props: ApplyPanelProps) {
  const { summary, deletionSummary, deleting, isApplying, onCancel, onApply } = props;
  const [typed, setTyped] = useState("");
  const isDeleting = deletionSummary.total > 0;
  const isTypedRight = typed.trim().toLowerCase() === CONFIRM_WORD;
  const confirmLabel = isDeleting ? "Apply and delete" : "Create now";

  return (
    <div
      role="alertdialog"
      aria-label="Confirm changes"
      className="rounded-md border border-line-strong bg-surface-overlay p-4"
    >
      <p className="font-semibold">{capitalize(describeAction(summary, deletionSummary))}?</p>
      {isDeleting ? (
        <>
          <DeletionWarning deleting={deleting} />
          <label className="mt-3 grid gap-1.5 text-sm">
            <span>
              Type <strong>{CONFIRM_WORD}</strong> to confirm
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="rounded-lg border border-line-strong bg-surface-inset px-3 py-2 text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
            />
          </label>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">
          This only adds new things. Nothing that already exists is renamed, changed, or deleted.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="bone"
          size="sm"
          onClick={onApply}
          disabled={isApplying || (isDeleting && !isTypedRight)}
        >
          {isApplying ? "Working…" : confirmLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isApplying}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The two-step apply: pick, then confirm in words. Deleting adds a typed confirmation on top. */
export function ApplyPanel(props: ApplyPanelProps) {
  const { summary, deletionSummary, isConfirming, onAskToConfirm, onStartOver } = props;
  if (isConfirming) return <ConfirmDialog {...props} />;

  const total = summary.total + deletionSummary.total;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="bone" onClick={onAskToConfirm} disabled={total === 0}>
        {total === 0 ? "Nothing selected" : capitalize(describeAction(summary, deletionSummary))}
      </Button>
      <Button variant="ghost" onClick={onStartOver}>
        New chat
      </Button>
    </div>
  );
}
