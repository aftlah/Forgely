"use client";

import { cn } from "./cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name. Required because the visible text is only "On" / "Off". */
  label: string;
  disabled?: boolean;
}

/** Toggle with an unmistakable state: ember track and "On" when enabled. */
export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="inline-flex cursor-pointer items-center gap-2.5 rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:cursor-default disabled:opacity-50"
    >
      <span
        className={cn(
          "relative h-6 w-[42px] rounded-full border transition-colors duration-150",
          checked ? "border-ember bg-ember" : "border-line-strong bg-surface-overlay",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-4 rounded-full transition-transform duration-150",
            checked ? "translate-x-[18px] bg-ink" : "bg-muted",
          )}
        />
      </span>
      <span
        className={cn(
          "min-w-[22px] font-mono text-xs font-medium",
          checked ? "text-fg" : "text-muted",
        )}
      >
        {checked ? "On" : "Off"}
      </span>
    </button>
  );
}
