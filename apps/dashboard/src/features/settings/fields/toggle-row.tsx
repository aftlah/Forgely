"use client";

import { Switch } from "@forgely/ui";

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A labelled on/off setting. */
export function ToggleRow({ title, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div>
        <p className="mb-0.5 text-[15px] font-semibold">{title}</p>
        <p className="text-[15px] text-muted">{description}</p>
      </div>
      <Switch label={title} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
