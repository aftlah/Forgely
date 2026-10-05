"use client";

import { Trash2 } from "lucide-react";

import { PLAN_LIMITS, type DeletionDiff, type DeletionStatus, type PlanDiff } from "@forgely/ai";
import { Checkbox } from "@forgely/ui";

import { areAllDeletableSelected, listDeletableIds } from "./plan-selection";

const STATUS_NOTES: Record<Exclude<DeletionStatus, "present">, string> = {
  gone: "already gone",
  changed: "renamed since, so it is not offered",
  protected: "Discord or Forgely needs this",
};

const KIND_LABELS = { role: "role", category: "category", channel: "channel" } as const;

function DeletionRow({
  entry,
  isChecked,
  onToggle,
}: {
  entry: DeletionDiff;
  isChecked: boolean;
  onToggle: () => void;
}) {
  const isOffered = entry.status === "present";
  const note = entry.status === "present" ? null : STATUS_NOTES[entry.status];
  return (
    <li className="flex items-center gap-3 py-1.5">
      <Checkbox
        tone="danger"
        checked={isOffered && isChecked}
        disabled={!isOffered}
        onChange={onToggle}
        aria-label={`Delete ${KIND_LABELS[entry.kind]} ${entry.name}`}
      />
      <span
        className={`flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 ${isOffered ? "" : "text-muted"}`}
      >
        <span className="break-all">{entry.name}</span>
        {note && <span className="text-sm">{note}</span>}
      </span>
      <span className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
        {KIND_LABELS[entry.kind]}
      </span>
    </li>
  );
}

interface DeletionSectionProps {
  diff: PlanDiff;
  deleteIds: ReadonlySet<string>;
  onToggle: (itemId: string) => void;
  onSetAll: (isSelected: boolean) => void;
}

/** What the AI proposes to remove. Separate from the rest and unticked, because deleting can't be undone. */
export function DeletionSection({ diff, deleteIds, onToggle, onSetAll }: DeletionSectionProps) {
  if (diff.deletions.length === 0) return null;
  const canSelect = listDeletableIds(diff).length > 0;
  const isAllSelected = areAllDeletableSelected(diff, deleteIds);

  return (
    <section aria-label="Proposed deletions" className="rounded-md border border-danger p-3">
      <h3 className="mb-1 flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-danger uppercase">
        <Trash2 className="size-3.5" aria-hidden="true" />
        Proposed deletions
      </h3>
      <p className="mb-2 text-sm text-muted">
        Nothing here is deleted unless you tick it and confirm. Deleting a category keeps its
        channels.
      </p>
      {diff.deletions.length >= PLAN_LIMITS.maxDeletions && (
        <p className="mb-2 text-sm" role="status">
          This is the most one plan can delete ({PLAN_LIMITS.maxDeletions}). If more should go, ask
          again after applying this one.
        </p>
      )}
      {canSelect && (
        <button
          type="button"
          onClick={() => onSetAll(!isAllSelected)}
          className="mb-1 cursor-pointer text-sm text-danger underline-offset-2 hover:underline"
        >
          {isAllSelected ? "Clear deletions" : "Select all deletions"}
        </button>
      )}
      <ul className="m-0 list-none p-0">
        {diff.deletions.map((entry) => (
          <DeletionRow
            key={entry.id}
            entry={entry}
            isChecked={deleteIds.has(entry.id)}
            onToggle={() => onToggle(entry.id)}
          />
        ))}
      </ul>
    </section>
  );
}
