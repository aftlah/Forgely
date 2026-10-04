"use client";

import { cn } from "@forgely/ui";

import type { ChannelOption } from "../guild-resources";

import { FieldError } from "./field-error";
import { CONTROL, FIELD_LABEL } from "./field-style";

interface ChannelSelectProps {
  id: string;
  label: string;
  hint?: string;
  value: string | null;
  /** Null when Discord could not be reached, so the list is unknown. */
  channels: ChannelOption[] | null;
  onChange: (channelId: string | null) => void;
  error?: string;
}

/** Picks a text channel, or "None". Keeps showing a saved channel even if it no longer exists. */
export function ChannelSelect({
  id,
  label,
  hint,
  value,
  channels,
  onChange,
  error,
}: ChannelSelectProps) {
  const isUnknown = value !== null && !channels?.some((channel) => channel.id === value);

  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        disabled={channels === null}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value || null)}
        className={cn(CONTROL, "max-w-80")}
      >
        <option value="">None</option>
        {isUnknown && <option value={value}>(channel not found)</option>}
        {channels?.map((channel) => (
          <option key={channel.id} value={channel.id}>
            #{channel.name}
          </option>
        ))}
      </select>
      {channels === null && (
        <p className="mt-2 text-sm text-muted">
          Couldn&apos;t load this server&apos;s channels from Discord. Reload the page to try again.
        </p>
      )}
      {hint && channels !== null && <p className="mt-2 text-sm text-muted">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
