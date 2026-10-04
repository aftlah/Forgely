"use client";

import type { ModerationConfig } from "@forgely/shared";

import { saveModuleSettingsAction } from "./actions";
import { ChannelSelect, ToggleRow } from "./fields";
import type { ChannelOption } from "./guild-resources";
import { SaveBar } from "./save-bar";
import { useSettingsForm } from "./use-settings-form";

interface ModerationFormProps {
  guildId: string;
  initial: { isEnabled: boolean; config: ModerationConfig };
  channels: ChannelOption[] | null;
}

export function ModerationSettingsForm({ guildId, initial, channels }: ModerationFormProps) {
  const form = useSettingsForm(initial, (value) =>
    saveModuleSettingsAction(guildId, "moderation", value.isEnabled, value.config),
  );
  const { draft } = form;
  const setConfig = (patch: Partial<ModerationConfig>): void =>
    form.update({ config: { ...draft.config, ...patch } });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (form.isDirty) void form.save();
      }}
      className="grid max-w-[720px] gap-8"
    >
      <ToggleRow
        title="Moderation"
        description="Turns /ban, /kick, /timeout, /warn, /warnings, and /purge on or off for this server."
        checked={draft.isEnabled}
        onChange={(isEnabled) => form.update({ isEnabled })}
      />

      <ChannelSelect
        id="mod-log-channel"
        label="Mod-log channel"
        hint="Every action is posted here. Pick None to keep cases in the database only."
        value={draft.config.modLogChannelId}
        channels={channels}
        onChange={(modLogChannelId) => setConfig({ modLogChannelId })}
        error={form.fieldError("modLogChannelId")}
      />

      <ToggleRow
        title="Message members about actions"
        description="Send a DM before a ban or kick, and after a timeout or warning."
        checked={draft.config.notifyUserByDm}
        onChange={(notifyUserByDm) => setConfig({ notifyUserByDm })}
      />

      <SaveBar
        isDirty={form.isDirty}
        state={form.state}
        onSave={() => void form.save()}
        onDiscard={form.discard}
      />
    </form>
  );
}
