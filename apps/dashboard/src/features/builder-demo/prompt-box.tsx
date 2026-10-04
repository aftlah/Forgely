"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";

import { cn } from "@forgely/ui";

import { useBuilderDemo } from "./builder-demo-context";
import { PRESET_LABELS, PRESETS, type PresetKey } from "./plans";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

const PLACEHOLDER_INTERVAL_MS = 3200;
const EXAMPLES = Object.values(PRESETS).map((plan) => plan.prompt);
const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

/** Cycles through example prompts until the visitor interacts, so they see what to write. */
function useRotatingPlaceholder(isActive: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % EXAMPLES.length),
      PLACEHOLDER_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [isActive]);

  return EXAMPLES[index] ?? "";
}

/** The hero's centerpiece: describe a community, get a plan. */
export function PromptBox() {
  const { showPlan } = useBuilderDemo();
  const reduceMotion = usePrefersReducedMotion();
  const [text, setText] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const placeholder = useRotatingPlaceholder(!hasInteracted && !reduceMotion);

  function submit(): void {
    const prompt = text.trim() || PRESETS.gaming.prompt;
    setText(prompt);
    showPlan(prompt);
    requestAnimationFrame(() =>
      document
        .getElementById("plan")
        ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }),
    );
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submit();
  }

  function choosePreset(key: PresetKey): void {
    setText(PRESETS[key].prompt);
    setActivePreset(key);
    setHasInteracted(true);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="relative mx-auto mt-11 max-w-[720px]">
        <label htmlFor="prompt" className="sr-only">
          Describe your community
        </label>
        <textarea
          id="prompt"
          rows={3}
          value={text}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(event) => {
            setText(event.target.value);
            setActivePreset(null);
          }}
          onFocus={() => setHasInteracted(true)}
          onKeyDown={handleKeyDown}
          className="block min-h-32 w-full resize-none rounded-lg border border-line-strong bg-surface-inset py-[22px] pr-[72px] pl-6 text-left text-[17px] leading-[1.55] text-fg transition-colors placeholder:text-[#75716a] focus-visible:border-ember focus-visible:shadow-[0_0_0_3px_rgb(255_90_31_/_0.25)] focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="Generate the plan"
          className="absolute right-3.5 bottom-3.5 grid size-11 cursor-pointer place-items-center rounded-full bg-ember text-ink transition-colors hover:bg-ember-400"
        >
          <ArrowUp className="size-5" aria-hidden="true" strokeWidth={2.4} />
        </button>
      </form>

      <div
        role="group"
        aria-label="Example descriptions"
        className="mt-4 flex flex-wrap justify-center gap-2"
      >
        {PRESET_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={activePreset === key}
            onClick={() => choosePreset(key)}
            className={cn(
              "cursor-pointer rounded-full border bg-transparent px-3.5 py-2 font-mono text-[13px] leading-none transition-colors",
              activePreset === key
                ? "border-ember text-fg"
                : "border-line text-muted hover:border-ember hover:text-fg",
            )}
          >
            {PRESET_LABELS[key]}
          </button>
        ))}
      </div>
    </>
  );
}
