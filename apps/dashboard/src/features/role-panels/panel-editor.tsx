"use client";

import type { RolePanel, RolePanelsConfig } from "@forgely/shared";
import { Button } from "@forgely/ui";

import { PanelButtonsEditor } from "./panel-buttons-editor";
import { PanelPreview } from "./panel-preview";
import { PanelPublishBar } from "./panel-publish-bar";

import { ChannelSelect, RadioGroup } from "@/features/settings/fields";
import { CONTROL, FIELD_LABEL } from "@/features/settings/fields/field-style";
import type { ChannelOption, RoleOption } from "@/features/settings/guild-resources";

const MODE_OPTIONS: { value: RolePanel["mode"]; label: string }[] = [
  { value: "toggle", label: "Each button adds or removes its own role" },
  { value: "unique", label: "Members hold one role at a time" },
];

interface PanelEditorProps {
  guildId: string;
  index: number;
  panel: RolePanel;
  channels: ChannelOption[] | null;
  roles: RoleOption[] | null;
  isDirty: boolean;
  onChange: (panel: RolePanel) => void;
  onRemove: () => void;
  onPublished: (config: RolePanelsConfig) => void;
  fieldError: (path: string) => string | undefined;
}

/** One panel: its text, channel, behavior, buttons, a live preview, and the post controls. */
export function PanelEditor({
  guildId,
  index,
  panel,
  channels,
  roles,
  isDirty,
  onChange,
  onRemove,
  onPublished,
  fieldError,
}: PanelEditorProps) {
  const set = (patch: Partial<RolePanel>): void => onChange({ ...panel, ...patch });
  const base = `panel-${index}`;
  const titleError = fieldError(`panels.${index}.title`);

  return (
    <section aria-label={`Panel ${index + 1}`} className="grid gap-5 border-t border-line pt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-[22px]">Panel {index + 1}</h2>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Delete panel
        </Button>
      </div>

      <div>
        <label htmlFor={`${base}-title`} className={FIELD_LABEL}>
          Title
        </label>
        <input
          id={`${base}-title`}
          type="text"
          value={panel.title}
          maxLength={100}
          onChange={(event) => set({ title: event.target.value })}
          className={CONTROL}
        />
        {titleError && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {titleError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${base}-description`} className={FIELD_LABEL}>
          Description
        </label>
        <textarea
          id={`${base}-description`}
          rows={3}
          value={panel.description}
          maxLength={2000}
          onChange={(event) => set({ description: event.target.value })}
          className={CONTROL}
        />
      </div>

      <ChannelSelect
        id={`${base}-channel`}
        label="Post in"
        value={panel.channelId}
        channels={channels}
        onChange={(channelId) => set({ channelId })}
        error={fieldError(`panels.${index}.channelId`)}
      />

      <RadioGroup
        legend="Behavior"
        name={`${base}-mode`}
        options={MODE_OPTIONS}
        value={panel.mode}
        onChange={(mode) => set({ mode })}
      />

      <div>
        <h3 className={FIELD_LABEL}>Buttons</h3>
        <PanelButtonsEditor
          panelIndex={index}
          buttons={panel.buttons}
          roles={roles}
          onChange={(buttons) => set({ buttons })}
          fieldError={fieldError}
        />
      </div>

      <PanelPreview panel={panel} roles={roles ?? []} />
      <PanelPublishBar
        guildId={guildId}
        panel={panel}
        channels={channels}
        isDirty={isDirty}
        onPublished={onPublished}
      />
    </section>
  );
}
