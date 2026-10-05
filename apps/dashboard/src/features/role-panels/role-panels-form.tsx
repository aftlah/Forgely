"use client";

import { Info, LayoutGrid, Tag } from "lucide-react";
import { useState } from "react";

import {
  MAX_BUTTONS_PER_PANEL,
  MAX_PANELS,
  type RolePanel,
  type RolePanelsConfig,
} from "@forgely/shared";
import { Switch } from "@forgely/ui";

import { publishRolePanelAction } from "./actions";
import { generatePanelId } from "./panel-id";
import { NewPanelTile, PanelTile } from "./panel-tile";
import { RolePanelDialog } from "./role-panel-dialog";

import { saveModuleSettingsAction } from "@/features/settings/actions";
import { SettingsCard } from "@/features/settings/fields";
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

const GOOD_TO_KNOW = [
  "Forgely can only hand out roles that sit below its own role in Server Settings.",
  "Posting uses what is saved. The dialog saves first, then posts.",
  `A panel holds up to ${MAX_BUTTONS_PER_PANEL} buttons, and a server up to ${MAX_PANELS} panels.`,
  "Turn the module off and panels already posted stop responding to clicks.",
];

interface PanelsCardProps {
  panels: RolePanel[];
  channels: ChannelOption[] | null;
  onOpen: (panel: RolePanel, index: number) => void;
  onAdd: () => void;
}

/** The grid of panels, ending in the tile that adds one. */
function PanelsCard({ panels, channels, onOpen, onAdd }: PanelsCardProps) {
  return (
    <SettingsCard
      title="Panels"
      icon={LayoutGrid}
      action={
        <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">
          {panels.length} / {MAX_PANELS}
        </span>
      }
    >
      <ul
        aria-label="Panels"
        className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3"
      >
        {panels.map((panel, index) => (
          <PanelTile
            key={panel.id}
            panel={panel}
            channels={channels}
            onOpen={() => onOpen(panel, index)}
          />
        ))}
        <NewPanelTile isDisabled={panels.length >= MAX_PANELS} max={MAX_PANELS} onAdd={onAdd} />
      </ul>
    </SettingsCard>
  );
}

function GoodToKnowCard() {
  return (
    <SettingsCard title="Good to know" icon={Info}>
      <ul className="m-0 grid list-none gap-3 p-0 text-sm text-muted">
        {GOOD_TO_KNOW.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </SettingsCard>
  );
}

/** The panel open in the dialog. `index` is where it sits in the list, or the list's length for a new one. */
interface Editing {
  panel: RolePanel;
  index: number;
}

export function RolePanelsForm({ guildId, initial, channels, roles }: RolePanelsFormProps) {
  const form = useSettingsForm(initial, (value) =>
    saveModuleSettingsAction(guildId, "role-panels", value.isEnabled, value.config),
  );
  const [editing, setEditing] = useState<Editing | null>(null);
  const { panels } = form.draft.config;
  const setPanels = (next: RolePanel[]): void =>
    form.update({ config: { ...form.draft.config, panels: next } });

  /**
   * Saves the whole list with this panel in it, then posts if asked. Posting works from what is saved, so
   * it can only follow a successful save. Resolves to a message on failure, or null on success.
   */
  async function savePanel(
    panel: RolePanel,
    index: number,
    shouldPost: boolean,
  ): Promise<string | null> {
    const next =
      index < panels.length
        ? panels.map((item, i) => (i === index ? panel : item))
        : [...panels, panel];
    const value = {
      isEnabled: form.draft.isEnabled,
      config: { ...form.draft.config, panels: next },
    };
    const saveError = await form.save(value);
    if (saveError) return saveError;

    if (shouldPost) {
      const posted = await publishRolePanelAction(guildId, panel.id).catch(() => null);
      if (!posted?.ok) {
        return `Saved, but it wasn't posted: ${posted?.message ?? "couldn't reach the server."}`;
      }
      // The server wrote the posted message's reference itself, so adopt its config as saved.
      form.resetTo({ isEnabled: value.isEnabled, config: posted.config });
    }
    setEditing(null);
    return null;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (form.isDirty) void form.save();
      }}
      className="mx-auto grid max-w-[1120px] gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="display flex items-center gap-2.5 text-[22px]">
            <Tag className="size-5 text-muted" aria-hidden="true" />
            Role panels
          </h2>
          <p className="mt-1 text-sm text-muted">
            Messages with buttons that give or take a role. This switch turns all panels on or off.
          </p>
        </div>
        <Switch
          label="Role panels module"
          checked={form.draft.isEnabled}
          onCheckedChange={(isEnabled) => form.update({ isEnabled })}
        />
      </div>

      {!form.draft.isEnabled && panels.some((panel) => panel.message) && (
        <p
          role="status"
          className="rounded-md border border-warning bg-surface-overlay p-3 text-sm"
        >
          This module is off, so panels already posted in Discord don&apos;t respond to clicks.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <PanelsCard
          panels={panels}
          channels={channels}
          onOpen={(panel, index) => setEditing({ panel, index })}
          onAdd={() => setEditing({ panel: newPanel(), index: panels.length })}
        />
        <GoodToKnowCard />
      </div>

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
      />

      {editing && (
        <RolePanelDialog
          // A new key per panel, so opening another one starts from its own saved values.
          key={editing.panel.id}
          panel={editing.panel}
          index={editing.index}
          isNew={editing.index >= panels.length}
          channels={channels}
          roles={roles}
          fieldError={form.fieldError}
          onSave={(panel, shouldPost) => savePanel(panel, editing.index, shouldPost)}
          onDelete={() => {
            setPanels(panels.filter((_, position) => position !== editing.index));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </form>
  );
}
