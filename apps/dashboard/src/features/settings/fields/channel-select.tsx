"use client";

import { Select, cn } from "@forgely/ui";

import type { ChannelOption } from "../guild-resources";

import { FieldError } from "./field-error";
import { FIELD_LABEL } from "./field-style";

interface ChannelSelectProps {
  id: string;
  label: string;
  hint?: string;
  value: string | null;
  /** Null when Discord could not be reached, so the list is unknown. */
  channels: ChannelOption[] | null;
  onChange: (channelId: string | null) => void;
  error?: string;
  /** Categories are listed by plain name; text channels get a leading #. */
  kind?: "channel" | "category";
  /** `inline` fits a card header: the label is kept for screen readers only, and there is no hint. */
  variant?: "stacked" | "inline";
}

/** Picks a text channel or a category, or "None". Keeps showing a saved one even if it no longer exists. */
export function ChannelSelect({
  id,
  label,
  hint,
  value,
  channels,
  onChange,
  error,
  variant = "stacked",
  kind = "channel",
}: ChannelSelectProps) {
  const isInline = variant === "inline";
  const prefix = kind === "category" ? "" : "#";

  return (
    <div>
      <label htmlFor={id} className={isInline ? "sr-only" : FIELD_LABEL}>
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={onChange}
        disabled={channels === null}
        invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        options={(channels ?? []).map((channel) => ({
          value: channel.id,
          label: `${prefix}${channel.name}`,
        }))}
        clearLabel="None"
        placeholder="None"
        unknownLabel={`(${kind} not found)`}
        className={cn(isInline ? "w-56 max-w-full py-2" : "max-w-80")}
      />
      {channels === null && (
        <p className="mt-2 text-sm text-muted">
          Couldn&apos;t load this server&apos;s channels from Discord. Reload the page to try again.
        </p>
      )}
      {hint && !isInline && channels !== null && <p className="mt-2 text-sm text-muted">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
