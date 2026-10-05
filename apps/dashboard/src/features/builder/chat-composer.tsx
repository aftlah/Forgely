"use client";

import { ArrowUp } from "lucide-react";
import { useState } from "react";

import { DESCRIPTION_LIMITS } from "@forgely/ai";

interface ChatComposerProps {
  isFollowUp: boolean;
  isDisabled: boolean;
  /** Text to put in the box, such as a clicked example. A new version replaces what is typed. */
  seed: { text: string; version: number };
  onSend: (text: string) => void;
}

/** The message box. Enter sends, Shift+Enter adds a line. */
export function ChatComposer({ isFollowUp, isDisabled, seed, onSend }: ChatComposerProps) {
  const [typed, setTyped] = useState({ version: 0, text: "" });
  // A newer seed (an example was clicked) wins over what was typed before it.
  const text = typed.version === seed.version ? typed.text : seed.text;
  const length = text.trim().length;
  const isValid = length >= DESCRIPTION_LIMITS.min && length <= DESCRIPTION_LIMITS.max;

  const submit = (): void => {
    if (!isValid || isDisabled) return;
    onSend(text);
    setTyped({ version: seed.version, text: "" });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="grid gap-1.5"
    >
      <div className="flex items-end gap-2 rounded-[22px] border border-line-strong bg-surface-inset p-2 pl-4 focus-within:border-ember">
        <textarea
          aria-label={isFollowUp ? "Ask for a change" : "Describe your server"}
          rows={2}
          value={text}
          maxLength={DESCRIPTION_LIMITS.max}
          disabled={isDisabled}
          onChange={(event) => setTyped({ version: seed.version, text: event.target.value })}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            submit();
          }}
          placeholder={
            isFollowUp
              ? "Ask for a change, like “add a voice channel for events”…"
              : "Describe your server…"
          }
          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent py-2 text-[15px] text-fg placeholder:text-muted focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!isValid || isDisabled}
          aria-label="Send"
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-bone text-ink transition-colors hover:bg-white disabled:cursor-default disabled:opacity-40"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p className="px-2 text-xs text-muted">
        AI can make mistakes. You review every plan before anything is created.
        <span className="float-right font-mono">
          {length} / {DESCRIPTION_LIMITS.max}
        </span>
      </p>
    </form>
  );
}
