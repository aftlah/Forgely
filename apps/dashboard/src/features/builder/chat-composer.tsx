"use client";

import { ArrowUp } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { DESCRIPTION_LIMITS } from "@forgely/ai";
import { cn } from "@forgely/ui";

/** The box grows with the text, up to this share of the window, then scrolls. */
const MAX_HEIGHT_SHARE = 0.45;
/** From this share of the limit the counter turns amber, so running out of room is no surprise. */
const NEAR_LIMIT_SHARE = 0.9;

interface ChatComposerProps {
  isFollowUp: boolean;
  isDisabled: boolean;
  /** Text to put in the box, such as a clicked example. A new version replaces what is typed. */
  seed: { text: string; version: number };
  onSend: (text: string) => void;
}

/** Sizes the box to its text so a long description can be read without scrolling inside a tiny field. */
function useAutoGrow(text: string) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    const maxHeight = Math.round(window.innerHeight * MAX_HEIGHT_SHARE);
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
  }, [text]);
  return textarea;
}

/** The message box. Enter sends, Shift+Enter adds a line. */
export function ChatComposer({ isFollowUp, isDisabled, seed, onSend }: ChatComposerProps) {
  const [typed, setTyped] = useState({ version: 0, text: "" });
  // A newer seed (an example was clicked) wins over what was typed before it.
  const text = typed.version === seed.version ? typed.text : seed.text;
  const textarea = useAutoGrow(text);
  const length = text.trim().length;
  const isValid = length >= DESCRIPTION_LIMITS.min && length <= DESCRIPTION_LIMITS.max;
  const isNearLimit = text.length >= DESCRIPTION_LIMITS.max * NEAR_LIMIT_SHARE;

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
      <div className="flex items-end gap-2 rounded-[22px] border border-line-strong bg-surface-inset p-2 pl-5 focus-within:border-ember">
        <textarea
          ref={textarea}
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
          className="min-h-14 flex-1 resize-none overflow-y-auto bg-transparent py-3 text-base leading-[1.65] text-fg placeholder:text-muted focus:outline-none disabled:opacity-60"
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
        <span className={cn("float-right font-mono", isNearLimit && "text-warning")}>
          {text.length} / {DESCRIPTION_LIMITS.max}
        </span>
      </p>
    </form>
  );
}
