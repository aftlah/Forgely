"use client";

import { FieldError } from "./field-error";
import { FIELD_LABEL } from "./field-style";
import { NumberInput } from "./number-input";

interface NumberFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  /** Shown after the box, for example "seconds". */
  unit?: string;
  onChange: (value: number) => void;
  error?: string;
}

/** A whole-number input. An emptied box counts as 0, which the server then rejects with a clear message. */
export function NumberField({
  id,
  label,
  hint,
  value,
  min,
  max,
  unit,
  onChange,
  error,
}: NumberFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <NumberInput
          id={id}
          value={value}
          min={min}
          max={max}
          onChange={onChange}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
