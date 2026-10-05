"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@forgely/ui";

interface NumberInputProps {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
}

const STEPPER =
  "grid size-9 shrink-0 cursor-pointer place-items-center text-muted transition-colors hover:bg-surface-overlay hover:text-fg disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted";

/**
 * A whole-number box with minus and plus buttons. The number can still be typed, and arrow keys still
 * work. An emptied box counts as 0, which the server then rejects with a clear message.
 */
export function NumberInput({
  id,
  value,
  min,
  max,
  onChange,
  className,
  ...aria
}: NumberInputProps) {
  const clamp = (next: number): number => Math.min(max, Math.max(min, next));

  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-[12px] border border-line bg-surface-inset focus-within:border-ember",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease"
        className={STEPPER}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) =>
          onChange(Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber)
        }
        className="h-9 w-16 [appearance:textfield] bg-transparent text-center text-[15px] text-fg focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...aria}
      />
      <button
        type="button"
        aria-label="Increase"
        className={STEPPER}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
