import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "./cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  /** `danger` is for choices that delete something. */
  tone?: "ember" | "danger";
};

/**
 * A checkbox that matches the rest of the UI. The real `<input>` stays in place (so labels, keyboard,
 * form behavior, and screen readers work as usual); it is only drawn differently.
 */
export function Checkbox({ tone = "ember", className, ...props }: CheckboxProps) {
  const fill =
    tone === "danger"
      ? "checked:border-danger checked:bg-danger"
      : "checked:border-ember checked:bg-ember";
  return (
    <span className={cn("relative inline-grid size-[18px] shrink-0 place-items-center", className)}>
      <input
        type="checkbox"
        {...props}
        className={cn(
          "peer size-[18px] cursor-pointer appearance-none rounded-[6px] border border-line-strong bg-surface-inset transition-colors",
          "hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
          "disabled:cursor-default disabled:opacity-50",
          fill,
        )}
      />
      <Check
        className="pointer-events-none absolute size-3 text-ink opacity-0 peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden="true"
      />
    </span>
  );
}
