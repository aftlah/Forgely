"use client";

import type { PlanDiff, ServerPlan } from "@forgely/ai";

import { DeletionSection } from "./deletion-section";
import { ChannelLabel, RowShell } from "./plan-rows";

interface PlanReviewProps {
  plan: ServerPlan;
  diff: PlanDiff;
  excluded: ReadonlySet<string>;
  onToggle: (itemId: string) => void;
  /** Deletions the user ticked. None are ticked until they choose. */
  deleteIds: ReadonlySet<string>;
  onToggleDelete: (itemId: string) => void;
  onSetAllDeletions: (isSelected: boolean) => void;
}

const SECTION_TITLE = "mb-2 font-mono text-[11px] tracking-[0.1em] text-muted uppercase";

/**
 * The plan as a checklist. New things start ticked. Proposed deletions are listed apart, start unticked,
 * and nothing is deleted unless the person ticks it and then confirms.
 */
export function PlanReview({
  plan,
  diff,
  excluded,
  onToggle,
  deleteIds,
  onToggleDelete,
  onSetAllDeletions,
}: PlanReviewProps) {
  const roleName = (key: string): string =>
    plan.roles.find((role) => role.key === key)?.name ?? key;
  const unticked = (id: string): boolean => excluded.has(id);

  return (
    <div className="grid gap-6">
      {plan.roles.length > 0 && (
        <section aria-label="Roles">
          <h3 className={SECTION_TITLE}>Roles</h3>
          <ul className="m-0 list-none p-0">
            {plan.roles.map((role, index) => {
              const entry = diff.roles[index];
              if (!entry) return null;
              return (
                <RowShell
                  key={role.key}
                  id={`item-${role.key}`}
                  label={`role ${role.name}`}
                  status={entry.status}
                  isChecked={!unticked(entry.id)}
                  isLocked={false}
                  onToggle={() => onToggle(entry.id)}
                >
                  <span
                    className="size-3 shrink-0 rounded-full border border-line-strong"
                    style={{ background: role.color ?? "transparent" }}
                    aria-hidden="true"
                  />
                  <span>{role.name}</span>
                </RowShell>
              );
            })}
          </ul>
        </section>
      )}

      {plan.categories.map((category, categoryIndex) => {
        const categoryEntry = diff.categories[categoryIndex];
        if (!categoryEntry) return null;
        const isCategoryOff = categoryEntry.status === "new" && unticked(categoryEntry.id);
        return (
          <section key={categoryEntry.id} aria-label={`Category ${category.name}`}>
            <ul className="m-0 list-none p-0">
              <RowShell
                id={`item-${categoryEntry.id}`}
                label={`category ${category.name}`}
                status={categoryEntry.status}
                isChecked={!isCategoryOff}
                isLocked={false}
                onToggle={() => onToggle(categoryEntry.id)}
              >
                <span className="font-semibold uppercase tracking-wide">{category.name}</span>
              </RowShell>
              {category.channels.map((channel, channelIndex) => {
                const entry = categoryEntry.channels[channelIndex];
                if (!entry) return null;
                const needsUntickedRole = channel.allowedRoleKeys.some((key) => unticked(key));
                const isOff = isCategoryOff || unticked(entry.id) || needsUntickedRole;
                return (
                  <RowShell
                    key={entry.id}
                    id={`item-${entry.id}`}
                    label={`channel ${channel.name}`}
                    status={entry.status}
                    isChecked={!isOff}
                    isLocked={isCategoryOff || needsUntickedRole}
                    onToggle={() => onToggle(entry.id)}
                    isNested
                  >
                    <ChannelLabel channel={channel} roleName={roleName} />
                  </RowShell>
                );
              })}
            </ul>
          </section>
        );
      })}
      <DeletionSection
        diff={diff}
        deleteIds={deleteIds}
        onToggle={onToggleDelete}
        onSetAll={onSetAllDeletions}
      />
    </div>
  );
}
