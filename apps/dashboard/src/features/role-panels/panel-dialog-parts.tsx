"use client";

import { Eye } from "lucide-react";
import type { ReactNode } from "react";

import type { RolePanel } from "@forgely/shared";
import { Switch, cn } from "@forgely/ui";

import { PanelPreview } from "./panel-preview";
import { PANEL_TEMPLATES, type PanelTemplate } from "./panel-templates";

import { ChannelSelect } from "@/features/settings/fields";
import type { ChannelOption, RoleOption } from "@/features/settings/guild-resources";

export const SECTION_LABEL =
  "mb-2 block font-mono text-[11px] tracking-[0.1em] text-muted uppercase";

const MODES: { value: RolePanel["mode"]; label: string; caption: string }[] = [
  {
    value: "toggle",
    label: "Multi-pick",
    caption: "Click to add or remove. Members can hold as many of these as they like.",
  },
  {
    value: "unique",
    label: "Pick one",
    caption: "Members hold one of these roles at a time. Picking another swaps it.",
  },
];

/** Why posting is not possible yet, or null when it is. */
export function findPostBlocker(panel: RolePanel): string | null {
  if (!panel.channelId) return "Pick a channel above to post.";
  if (panel.buttons.length === 0) return "Add at least one role to post.";
  return null;
}

interface SectionProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Section({ label, htmlFor, children }: SectionProps) {
  return (
    <div className="border-b border-line px-5 py-4 last:border-b-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={SECTION_LABEL}>
          {label}
        </label>
      ) : (
        <p className={SECTION_LABEL}>{label}</p>
      )}
      {children}
    </div>
  );
}

export function TemplatePicker({ onPick }: { onPick: (template: PanelTemplate) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PANEL_TEMPLATES.map((template) => (
        <button
          key={template.label}
          type="button"
          onClick={() => onPick(template)}
          className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-ember hover:text-fg"
        >
          {template.label}
        </button>
      ))}
    </div>
  );
}

export function BehaviorPicker({
  value,
  onChange,
}: {
  value: RolePanel["mode"];
  onChange: (mode: RolePanel["mode"]) => void;
}) {
  return (
    <>
      <div
        role="radiogroup"
        aria-label="Behavior"
        className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-inset p-1"
      >
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={mode.value === value}
            onClick={() => onChange(mode.value)}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors",
              mode.value === value ? "bg-bone text-ink" : "text-muted hover:text-fg",
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {MODES.find((mode) => mode.value === value)?.caption}
      </p>
    </>
  );
}

interface ChannelSectionProps {
  id: string;
  panel: RolePanel;
  channels: ChannelOption[] | null;
  willPost: boolean;
  postBlocker: string | null;
  error: string | undefined;
  onChannel: (channelId: string | null) => void;
  onWantsPost: (wantsPost: boolean) => void;
}

/** Where to post, and whether saving should also post. */
export function ChannelSection(props: ChannelSectionProps) {
  const { id, panel, channels, willPost, postBlocker, error } = props;
  return (
    <Section label="Channel">
      <ChannelSelect
        id={id}
        label="Post in"
        hint="Required to post. You can save a panel without one and post it later."
        value={panel.channelId}
        channels={channels}
        onChange={props.onChannel}
        error={error}
      />
      <div className="mt-3 flex items-center justify-between gap-4 rounded-md border border-line bg-surface-inset px-4 py-3">
        <div>
          <p className="text-[15px] font-semibold">Post to Discord on save</p>
          <p className="text-sm text-muted">
            {postBlocker ?? "Posts, or updates the message in place."}
          </p>
        </div>
        <Switch
          label="Post to Discord on save"
          checked={willPost}
          disabled={postBlocker !== null}
          onCheckedChange={props.onWantsPost}
        />
      </div>
    </Section>
  );
}

export function PreviewPane({
  panel,
  roles,
  destination,
}: {
  panel: RolePanel;
  roles: RoleOption[] | null;
  destination: string | undefined;
}) {
  return (
    <aside
      aria-label="Preview"
      className="min-w-0 border-t border-line bg-surface-inset/50 p-5 lg:border-t-0 lg:border-l"
    >
      {/* Sticks to the top while the long form on the left scrolls, so the preview is always in view. */}
      <div className="lg:sticky lg:top-5">
        <p className={cn(SECTION_LABEL, "flex items-center gap-2")}>
          <Eye className="size-3.5" aria-hidden="true" />
          Preview
        </p>
        <p className="mb-2 font-mono text-xs text-muted">
          {destination ? `#${destination}` : "No channel selected"}
        </p>
        <PanelPreview panel={panel} roles={roles ?? []} />
      </div>
    </aside>
  );
}
