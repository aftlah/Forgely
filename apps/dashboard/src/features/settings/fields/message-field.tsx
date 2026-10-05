"use client";

import { useRef } from "react";

import { renderTemplate } from "@forgely/shared";
import { cn } from "@forgely/ui";

import { DiscordMessagePreview } from "./discord-message-preview";
import { FieldError } from "./field-error";
import { CONTROL, FIELD_LABEL } from "./field-style";

const MESSAGE_MAX_LENGTH = 2000;

interface MessageFieldProps {
  id: string;
  label: string;
  value: string;
  /** The placeholders this message understands, shown as insert buttons. */
  variables: readonly string[];
  /** What each placeholder turns into in the preview. */
  sampleValues: Record<string, string>;
  onChange: (value: string) => void;
  error?: string;
  /** Rows of the text box. */
  rows?: number;
  /** Draws the preview like a Discord message. Without it the preview is plain text. */
  previewAs?: { where: string; isSent: boolean; unsentNote?: string };
  /** `card` lets the field use the full width of a settings card. */
  layout?: "page" | "card";
}

/** A message template with variable buttons and a live preview using sample values. */
export function MessageField({
  id,
  label,
  value,
  variables,
  sampleValues,
  onChange,
  error,
  rows = 3,
  previewAs,
  layout = "page",
}: MessageFieldProps) {
  const widthClass = layout === "card" ? "" : "max-w-[640px]";
  const textarea = useRef<HTMLTextAreaElement>(null);
  const preview = renderTemplate(value, sampleValues);

  function insertVariable(name: string): void {
    const field = textarea.current;
    const token = `{${name}}`;
    if (!field) return onChange(value + token);

    const start = field.selectionStart;
    const end = field.selectionEnd;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <textarea
        id={id}
        ref={textarea}
        rows={rows}
        value={value}
        maxLength={MESSAGE_MAX_LENGTH}
        spellCheck={false}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROL, widthClass, "resize-y leading-[1.55]")}
      />
      <div className={cn("mt-2 flex flex-wrap items-center gap-2", widthClass)}>
        {variables.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => insertVariable(name)}
            className="cursor-pointer rounded-full border border-line px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-ember hover:text-fg"
          >
            {`{${name}}`}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-muted">
          {value.length}/{MESSAGE_MAX_LENGTH}
        </span>
      </div>
      <FieldError id={`${id}-error`} message={error} />
      <p className="mt-4 mb-1 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
        Preview
      </p>
      {previewAs ? (
        <DiscordMessagePreview {...previewAs} text={preview} />
      ) : (
        <p
          className={cn(
            "rounded-md border border-line bg-surface-inset px-4 py-3 text-[15px] break-words whitespace-pre-wrap",
            widthClass,
          )}
        >
          {preview || <span className="text-muted">Nothing to show yet.</span>}
        </p>
      )}
    </div>
  );
}
