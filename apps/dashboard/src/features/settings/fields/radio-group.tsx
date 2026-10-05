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

/**
 * Pick exactly one of a few options, drawn as cards. They are still native radios, so arrow keys and screen
 * readers just work; only their look changed.
 */
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
      <div className="grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-line bg-surface-inset px-4 py-3 transition-colors hover:border-line-strong has-[:checked]:border-ember has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface-inset transition-all checked:border-[5px] checked:border-ember focus-visible:outline-none"
            />
            <span className="text-[15px]">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
