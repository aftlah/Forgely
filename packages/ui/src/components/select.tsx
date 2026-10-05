"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";
import { useState } from "react";

import { cn } from "./cn";
import { usePortalContainer } from "./portal-container";

export interface SelectOption {
  value: string;
  label: string;
  /** A small colored dot before the label, for example a role's color. */
  color?: string | null;
  /** A short note on the right, for example why an option cannot be chosen. */
  note?: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** The chosen option's value, or null when nothing is chosen. */
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  /** When given, the list starts with an entry that clears the choice, such as "None". */
  clearLabel?: string;
  /** Shown for a saved value that is no longer in `options`, so it is never silently dropped. */
  unknownLabel?: string;
  /** The search box appears when there are more options than this. */
  searchFrom?: number;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

const CLEAR_VALUE = "__clear__";
const DEFAULT_SEARCH_FROM = 7;

/** Matches on the option's label only (not on its value, which may be an ID made of digits). */
function matchLabel(_value: string, search: string, keywords: string[] = []): number {
  return keywords.join(" ").toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0;
}

function Dot({ color }: { color: string | null | undefined }) {
  if (!color) return null;
  return (
    <span
      aria-hidden="true"
      className="size-2.5 shrink-0 rounded-full border border-line-strong"
      style={{ background: color }}
    />
  );
}

interface OptionRowProps {
  option: SelectOption;
  isSelected: boolean;
  onPick: () => void;
}

function OptionRow({ option, isSelected, onPick }: OptionRowProps) {
  return (
    <Command.Item
      value={option.value}
      keywords={[option.label]}
      disabled={option.disabled}
      onSelect={onPick}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] text-fg data-[disabled=true]:cursor-default data-[disabled=true]:opacity-45 data-[selected=true]:bg-surface-raised"
    >
      <Dot color={option.color} />
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {option.note && (
        <span className="max-w-[45%] shrink-0 truncate font-mono text-[11px] text-muted">
          {option.note}
        </span>
      )}
      {isSelected && <Check className="size-4 shrink-0 text-ember" aria-hidden="true" />}
    </Command.Item>
  );
}

/**
 * A dropdown that can be searched. It replaces the browser's own `<select>`, which cannot be styled
 * and cannot search a long list of channels or roles. Keyboard: arrows move, Enter picks, Escape closes,
 * and typing filters. The list is drawn in a popover that matches the trigger's width.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  clearLabel,
  unknownLabel = "(not found)",
  searchFrom = DEFAULT_SEARCH_FROM,
  disabled,
  invalid,
  id,
  className,
  ...aria
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const container = usePortalContainer();
  const selected = options.find((option) => option.value === value);
  const isSearchable = options.length > searchFrom;
  // The trigger fills its container unless the caller sets a width (plain class merging cannot undo `w-full`).
  const hasOwnWidth = /(^|\s)w-/.test(className ?? "");

  function pick(next: string | null): void {
    onChange(next);
    setIsOpen(false);
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-[12px] border bg-surface-inset px-3.5 py-[11px] text-left text-[15px] text-fg transition-colors",
            "hover:border-line-strong focus-visible:border-ember focus-visible:outline-none disabled:cursor-default disabled:opacity-60",
            hasOwnWidth ? "" : "w-full",
            invalid ? "border-danger" : "border-line",
            isOpen && "border-ember",
            className,
          )}
          {...aria}
        >
          <Dot color={selected?.color} />
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>
            {selected?.label ?? (value === null ? placeholder : unknownLabel)}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted transition-transform",
              isOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </Popover.Trigger>

      <Popover.Portal container={container}>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] w-(--radix-popover-trigger-width) min-w-64 rounded-[14px] border border-line-strong bg-surface-overlay p-1.5 text-fg"
        >
          <Command filter={matchLabel} loop label={aria["aria-label"] ?? "Options"}>
            <div
              className={cn(
                "flex items-center gap-2 border-b border-line px-2.5 pb-2",
                !isSearchable && "sr-only",
              )}
            >
              <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <Command.Input
                placeholder="Search…"
                aria-label="Search options"
                className="w-full bg-transparent py-1 text-[15px] text-fg placeholder:text-muted focus:outline-none"
              />
            </div>
            <Command.List
              className={cn("max-h-64 overflow-x-hidden overflow-y-auto", isSearchable && "mt-1.5")}
            >
              <Command.Empty className="px-2.5 py-3 text-sm text-muted">
                Nothing matches.
              </Command.Empty>
              {clearLabel && (
                <Command.Item
                  value={CLEAR_VALUE}
                  keywords={[clearLabel]}
                  onSelect={() => pick(null)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] text-muted data-[selected=true]:bg-surface-raised"
                >
                  <span className="flex-1">{clearLabel}</span>
                  {value === null && <Check className="size-4 text-ember" aria-hidden="true" />}
                </Command.Item>
              )}
              {options.map((option) => (
                <OptionRow
                  key={option.value}
                  option={option}
                  isSelected={option.value === value}
                  onPick={() => pick(option.value)}
                />
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
