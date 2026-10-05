import { Check, Minus, Trash2, X } from "lucide-react";

import { Button } from "@forgely/ui";

import type { ApplyItemResult, ApplyResult } from "./apply-plan";

const OUTCOME_ICON = {
  created: { Icon: Check, className: "text-success", label: "Created" },
  "created-as-text": { Icon: Check, className: "text-warning", label: "Created as a text channel" },
  deleted: { Icon: Trash2, className: "text-danger", label: "Deleted" },
  failed: { Icon: X, className: "text-danger", label: "Failed" },
  skipped: { Icon: Minus, className: "text-muted", label: "Skipped" },
} as const;

function ItemLine({ item }: { item: ApplyItemResult }) {
  const { Icon, className, label } = OUTCOME_ICON[item.outcome];
  return (
    <li className="flex items-start gap-3 py-1">
      <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} role="img" aria-label={label} />
      <span className="min-w-0">
        <span className="break-all">{item.name}</span>
        <span className="ml-2 font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
          {item.kind}
        </span>
        {item.outcome === "created-as-text" && (
          <span className="block text-sm text-muted">
            Created as a text channel because this server isn&apos;t a Community server.
          </span>
        )}
        {item.message && <span className="block text-sm text-muted">{item.message}</span>}
      </span>
    </li>
  );
}

/** What applying actually did, item by item, so a partial failure is never hidden. */
export function ApplySummary({
  result,
  onStartOver,
}: {
  result: ApplyResult;
  onStartOver: () => void;
}) {
  const total = result.items.length;
  return (
    <section aria-label="Result" className="grid gap-4" role="status">
      <h2 className="display text-[22px]">
        {result.failedCount === 0
          ? "Done."
          : `Completed ${result.createdCount + result.deletedCount} of ${total}.`}
      </h2>
      {result.failedCount > 0 && (
        <p className="text-sm text-muted">
          Some items could not be created or deleted. What worked is already done in your server.
          You can plan again; anything that now exists is skipped.
        </p>
      )}
      <ul className="m-0 list-none p-0">
        {result.items.map((item, index) => (
          <ItemLine key={`${item.kind}-${item.name}-${index}`} item={item} />
        ))}
      </ul>
      <div>
        <Button variant="ghost" size="sm" onClick={onStartOver}>
          Plan something else
        </Button>
      </div>
    </section>
  );
}
