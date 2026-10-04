"use client";

import { Plus } from "lucide-react";

import { MAX_PANELS, type RolePanel, type RolePanelsConfig } from "@forgely/shared";
import { Button } from "@forgely/ui";

import { PanelEditor } from "./panel-editor";
import { generatePanelId } from "./panel-id";

import { saveModuleSettingsAction } from "@/features/settings/actions";
import { ToggleRow } from "@/features/settings/fields";
import type { ChannelOption, RoleOption } from "@/features/settings/guild-resources";
import { SaveBar } from "@/features/settings/save-bar";
import { useSettingsForm } from "@/features/settings/use-settings-form";

interface RolePanelsFormProps {
  guildId: string;
  initial: { isEnabled: boolean; config: RolePanelsConfig };
  channels: ChannelOption[] | null;
  roles: RoleOption[] | null;
}

function newPanel(): RolePanel {
  return {
    id: generatePanelId(),
    title: "Choose your roles",
    description: "Press a button to add or remove a role.",
    channelId: null,
    message: null,
    mode: "toggle",
    buttons: [],
  };
}

export function RolePanelsForm({ guildId, initial, channels, roles }: RolePanelsFormProps) {
  const form = useSettingsForm(initial, (value) =>
    saveModuleSettingsAction(guildId, "role-panels", value.isEnabled, value.config),
  );
  const { panels } = form.draft.config;
  const setPanels = (next: RolePanel[]): void =>
    form.update({ config: { ...form.draft.config, panels: next } });

  /** After posting, the server wrote the new message reference itself, so adopt its config as saved. */
  function adoptPublished(config: RolePanelsConfig): void {
    form.resetTo({ isEnabled: form.draft.isEnabled, config });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (form.isDirty) void form.save();
      }}
      className="grid max-w-[720px] gap-8"
    >
      <ToggleRow
        title="Role panels"
        description="Messages with buttons that give or take a role. Turn this off and the buttons stop working."
        checked={form.draft.isEnabled}
        onChange={(isEnabled) => form.update({ isEnabled })}
      />
      {!form.draft.isEnabled && panels.some((panel) => panel.message) && (
        <p
          role="status"
          className="rounded-md border border-warning bg-surface-overlay p-3 text-sm"
        >
          This module is off, so panels already posted in Discord don&apos;t respond to clicks.
        </p>
      )}

      {panels.length === 0 && (
        <p className="border-t border-line pt-8 text-sm text-muted">
          No panels yet. A panel is one message with role buttons. Add one to get started.
        </p>
      )}

      {panels.map((panel, index) => (
        <PanelEditor
          key={panel.id}
          guildId={guildId}
          index={index}
          panel={panel}
          channels={channels}
          roles={roles}
          isDirty={form.isDirty}
          onChange={(next) =>
            setPanels(panels.map((item, position) => (position === index ? next : item)))
          }
          onRemove={() => setPanels(panels.filter((_, position) => position !== index))}
          onPublished={adoptPublished}
          fieldError={form.fieldError}
        />
      ))}

      <div>
        <Button
          variant="ghost"
          size="sm"
          disabled={panels.length >= MAX_PANELS}
          onClick={() => setPanels([...panels, newPanel()])}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add a panel
        </Button>
      </div>

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
      />
    </form>
  );
}
