"use client";

import { Lock } from "lucide-react";

import type { AccessChangeDiff, ChannelAccess, PlanDiff } from "@forgely/ai";
import { Checkbox } from "@forgely/ui";

import { areAllAccessSelected, listAccessIds } from "./plan-selection";

/** Plain words for each level, shared with the confirmation so both say the same thing. */
export const ACCESS_LABELS: Record<ChannelAccess, string> = {
  public: "everyone can see and talk",
  "read-only": "everyone can read, only chosen roles can talk",
  private: "only chosen roles can see it",
};

/** "#rules (Info): everyone can read ... -> only chosen roles can see it (Staff)". */
export function describeAccessChange(change: AccessChangeDiff): string {
  const roles = change.to === "private" && change.roleNames.length > 0;
  const suffix = roles ? ` (${change.roleNames.join(", ")})` : "";
  return `${ACCESS_LABELS[change.from]} \u2192 ${ACCESS_LABELS[change.to]}${suffix}`;
}

function AccessRow({
  change,
  isChecked,
  onToggle,
}: {
  change: AccessChangeDiff;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-start gap-3 py-1.5">
      <Checkbox
        checked={isChecked}
        onChange={onToggle}
        aria-label={`Change who can use channel ${change.name}`}
        className="mt-0.5"
      />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="break-all">
          {change.name}
          {change.categoryName && (
            <span className="text-sm text-muted"> in {change.categoryName}</span>
          )}
        </span>
        <span className="text-sm text-muted">{describeAccessChange(change)}</span>
      </span>
    </li>
  );
}

interface AccessSectionProps {
  diff: PlanDiff;
  accessIds: ReadonlySet<string>;
  onToggle: (channelId: string) => void;
  onSetAll: (isSelected: boolean) => void;
}

/** Existing channels whose visibility the plan would change. Unticked: it changes who can see them. */
export function AccessSection({ diff, accessIds, onToggle, onSetAll }: AccessSectionProps) {
  if (diff.accessChanges.length === 0) return null;
  const isAllSelected = areAllAccessSelected(diff, accessIds);

  return (
    <section
      aria-label="Proposed access changes"
      className="rounded-md border border-line-strong p-3"
    >
      <h3 className="mb-1 flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
        <Lock className="size-3.5" aria-hidden="true" />
        Proposed access changes
      </h3>
      <p className="mb-2 text-sm text-muted">
        Nothing here changes unless you tick it and confirm. Only who can see or talk is edited, for
        @everyone, the roles listed, and Forgely. Other permissions on the channel stay as they are.
      </p>
      <button
        type="button"
        onClick={() => onSetAll(!isAllSelected)}
        className="mb-1 cursor-pointer text-sm underline-offset-2 hover:underline"
      >
        {isAllSelected ? "Clear access changes" : "Select all access changes"}
      </button>
      <ul className="m-0 list-none p-0">
        {diff.accessChanges.map((change) => (
          <AccessRow
            key={change.id}
            change={change}
            isChecked={accessIds.has(change.id)}
            onToggle={() => onToggle(change.id)}
          />
        ))}
      </ul>
    </section>
  );
}

export { listAccessIds };
