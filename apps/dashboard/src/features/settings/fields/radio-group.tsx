"use client";

import { FIELD_LABEL } from "./field-style";

interface RadioOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface RadioGroupProps<TValue extends string> {
  legend: string;
  name: string;
  options: RadioOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

/** Pick exactly one of a few options. Native radios, so arrow keys and screen readers just work. */
export function RadioGroup<TValue extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: RadioGroupProps<TValue>) {
  return (
    <fieldset>
      <legend className={FIELD_LABEL}>{legend}</legend>
      <div className="grid gap-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-surface-overlay"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="size-4 accent-ember"
            />
            <span className="text-[15px]">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
