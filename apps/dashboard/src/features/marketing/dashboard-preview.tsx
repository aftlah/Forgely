"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Button, cn, Switch, Window } from "@forgely/ui";

const CHANNEL_OPTIONS = ["#mod-log", "#staff", "None (store cases only)"];

const NAV_ITEMS = [
  { label: "Overview" },
  { label: "Moderation", isCurrent: true },
  { label: "Welcome" },
  { label: "Automod", isSoon: true },
  { label: "Leveling", isSoon: true },
  { label: "Tickets", isSoon: true },
  { label: "AI Builder" },
];

interface Settings {
  isEnabled: boolean;
  modLogChannel: string;
  notifyByDm: boolean;
}

const INITIAL_SETTINGS: Settings = { isEnabled: true, modLogChannel: "#mod-log", notifyByDm: true };

function hasChanges(saved: Settings, draft: Settings): boolean {
  return (
    saved.isEnabled !== draft.isEnabled ||
    saved.modLogChannel !== draft.modLogChannel ||
    saved.notifyByDm !== draft.notifyByDm
  );
}

function SideNav() {
  return (
    <aside
      aria-label="Dashboard navigation"
      className="border-b border-line bg-surface-inset py-[18px] sm:border-r sm:border-b-0"
    >
      <p className="flex items-center gap-2.5 px-[18px] pb-4 text-[15px] font-semibold">
        <span className="grid size-7 place-items-center rounded-full border border-line-strong bg-ink font-display text-[13px] font-bold">
          F
        </span>
        Test Server
      </p>
      <ul className="m-0 flex list-none overflow-x-auto p-0 text-sm sm:block sm:overflow-visible">
        {NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <span
              aria-current={item.isCurrent ? "page" : undefined}
              className={cn(
                "block whitespace-nowrap border-b-[3px] border-transparent px-[18px] py-2 sm:border-b-0 sm:border-l-[3px]",
                item.isCurrent ? "border-ember bg-surface-raised text-fg" : "text-muted",
                item.isSoon && "opacity-55",
              )}
            >
              {item.label}
              {item.isSoon && (
                <em className="ml-1.5 font-mono text-[10px] font-medium tracking-[0.06em] uppercase not-italic">
                  soon
                </em>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** A working miniature of a settings page: toggles mark it dirty, Save and Discard respond. */
export function DashboardPreview() {
  const [saved, setSaved] = useState(INITIAL_SETTINGS);
  const [draft, setDraft] = useState(INITIAL_SETTINGS);
  const [justSaved, setJustSaved] = useState(false);
  const isDirty = hasChanges(saved, draft);

  function update(patch: Partial<Settings>): void {
    setDraft((current) => ({ ...current, ...patch }));
    setJustSaved(false);
  }

  return (
    // minmax(0, 1fr) lets the single mobile column shrink; a bare grid would widen to fit the
    // nowrap nav tabs and clip the panel.
    <Window className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[210px_minmax(0,1fr)]">
      <SideNav />
      <div className="min-w-0 p-6">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h3 className="display text-[26px]">Moderation</h3>
          <Switch
            label="Moderation module"
            checked={draft.isEnabled}
            onCheckedChange={(isEnabled) => update({ isEnabled })}
          />
        </div>
        <p className="text-[15px] text-muted">
          /ban, /kick, /timeout, /warn, /warnings, /purge, with a stored case history.
        </p>

        <div className="mt-6">
          <label htmlFor="modlog" className="mb-2 block text-[15px] font-semibold">
            Mod-log channel
          </label>
          <select
            id="modlog"
            value={draft.modLogChannel}
            onChange={(event) => update({ modLogChannel: event.target.value })}
            className="w-full max-w-80 rounded-sm border border-line-strong bg-surface-inset px-3.5 py-[11px] text-[15px] text-fg focus-visible:border-ember focus-visible:outline-none"
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div>
            <p className="mb-0.5 text-[15px] font-semibold">Message members about actions</p>
            <p className="text-[15px] text-muted">
              Send a DM before a ban or kick, and after a timeout or warning.
            </p>
          </div>
          <Switch
            label="Message members about actions"
            checked={draft.notifyByDm}
            onCheckedChange={(notifyByDm) => update({ notifyByDm })}
          />
        </div>

        {isDirty && (
          <div className="mt-7 flex animate-rise flex-wrap items-center justify-between gap-3 rounded-md border border-line-strong bg-surface-overlay py-3 pr-3.5 pl-4 text-sm motion-reduce:animate-none">
            <span className="inline-flex items-center gap-2.5">
              <i className="size-2 rounded-full bg-warning" aria-hidden="true" />
              Unsaved changes
            </span>
            <span className="inline-flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDraft(saved)}>
                Discard
              </Button>
              <Button
                variant="bone"
                size="sm"
                onClick={() => {
                  setSaved(draft);
                  setJustSaved(true);
                }}
              >
                Save changes
              </Button>
            </span>
          </div>
        )}
        {justSaved && !isDirty && (
          <p role="status" className="mt-7 flex items-center gap-2 text-sm text-success">
            <Check className="size-[18px]" aria-hidden="true" />
            Saved. The bot picked up the change.
          </p>
        )}
      </div>
    </Window>
  );
}
